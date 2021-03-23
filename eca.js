/*

Welcome to the source code for Enhanced/Easier CSS Animations (eca)! 

I had the idea for this app while working on my previous project,
Storybook Websites, and my need to simplify how I dynamically added animations 
to elements (mostly on scroll when they appeared).

As such, most of the functions below I took straight from that app
and expanded or modified. The readyElementsForAnimation function, for instance,
since it was responsible for doing the main bulk of the "animation" work,
was completely rewritten to automate how elements were selected from the DOM
and grouped together into timelines for animation. 

Whether you're using an animation library, or making animations yourself,
most code for selecting elements and animating them takes the following form,
which can span many hundreds of lines: 

var element1 = document.querySelectorAll('.element1').
element1.addSetupPropertiesToElements(prop1: 'property 1', prop2: etc...);
var element2 = document....
element2.addSetupPropertiesToElements(prop1: ...)
var element50 = document.... etc... 
And even more code to group them together into timelines if needed... 

With this framework there's no more of that! 

The main bulk of the functionality for this app
is found in the readyElementsForAnimation 
function and the functions private to it, where
most of the above code is automated. 

Note: This app was written using ES5 syntax, 
and as such, the app should work on most older browsers
back to IE10 (when the css 'animation' shorthand property 
was added). 

*/


    //a high level overview of the application
    //in terms of features, also serves as 
    //our app's namespace (eca = enhanced/easier css animations)
    var eca = {
    
        ready: function(callback)
        {
            if (document.readyState !== 'loading')
            {
                callback();
            } 
            else //wait for dom content to load first
            {
                document.addEventListener('DOMContentLoaded', callback);
            } 
        },
        readyAll: function(callback)
        {
            if (document.readyState === 'complete')
            {
                callback();
            }
            else //wait for everything to load first
            {
                window.addEventListener('load', callback);
            }
        },
        animatable: { elementsToAnimate: [] },
        appState: { windowHeight: window.innerHeight,  //so we can use this in scroll handlers without querying it every time (only updated on resize events)
                    updating: false, //so when scroll and resize events fire at same time animations don't update twice
                    groupDelayIds: [] //for canceling setTimeouts used in app to handle delaying animations for groups of elements
        },
        helperFns: {}

    };
    
    
    /*HELPER FUNCTIONS
    ===================================================================*/
    
    //generic event listener for a single DOM element
    eca.helperFns.listenOnElem = function(obj, event, callback, useCapture)
    {
        obj = typeof obj === 'string' ? document.querySelector(obj) : obj;
        obj.addEventListener(event, callback, useCapture);
    };
    
    //event listener for array of dom elements
    eca.helperFns.listenOnAllElems = function(objs, event, callback, useCapture)
    {
        objs = typeof objs === 'string' ? eca.helperFns.getElementsToArray(objs) : objs;
        objs.forEach(function(obj)
        {
            eca.helperFns.listenOnElem(obj, event, callback, useCapture); 
        });
    };
   
    eca.helperFns.getElementsToArray = function(queryString)
    {
        return [].slice.call( document.querySelectorAll(queryString) );
    };
    
    //standard throttle
    //the last event to come in while function is in throttle
    //is processed after throttle limit expires
    eca.helperFns.throttle = function(func, limit)
    {
        
      var inThrottle = null;
      var event = null; 
      
      var throttledHandler = function(e) 
      {
        var args = arguments;
        var context = this;
        
        event = e; 
        
        if (!inThrottle) 
        {
            func.apply(context, args); //when used as callback in event listeners, context will be elem listener is set on
            event = null; 
            
            inThrottle = setTimeout(function()
            {
              inThrottle = null; 
              
              if (event) 
              {
                  //have to call with context since setTimeout 
                  //is executed in the global context here
                  throttledHandler.call(context, event);
              }
              
            }, limit); 
        }
        
      };
      
      return throttledHandler; 
      
    };
    
    
    /* ANIMATION FUNCTIONS
    ==============================================================*/
    
    
    //checks if element is visible. takes an animatable html elem,
    //and an optional triggerOffset (amount that offsets on screen 
    //where element is considered in view).
    eca.animatable.elementInView = function(elem, triggerOffset)
    {
        var windowHeight = eca.appState.windowHeight;
        var elementCoords = elem.getBoundingClientRect();
        elem.top = elementCoords.top;
        elem.bottom = elementCoords.bottom;
       
        triggerOffset = eca.animatable.getMaxTriggerOffset(elem, windowHeight, triggerOffset);
        
        //elem is visible when top or bottom is in range 0 to windowHeight inclusive
        var elementInViewAbove = ( (elem.top + triggerOffset) <= windowHeight && elem.top >= 0);
        var elementInViewBelow = ( (elem.bottom - triggerOffset) >= 0 && elem.bottom <= windowHeight);
        var viewPortInsideElement = (elem.bottom > windowHeight && elem.top < 0);
        
        elem.inView =  elementInViewAbove || elementInViewBelow || viewPortInsideElement; 
        
    };
    
    //triggerOffset is the amount in pixels we offset the top and bottom of an element by before it's considered visible
    //Since the user can enter any number for offset (pixel value), the behavior of offset can be buggy dependent on
    //window.innerHeight (which changes on resize) and element height (which can also change on resize), which
    //setting a max offset prevents. 
    //An elem is in-view when its top (or bottom) is in the range windowHeight and 0 inclusive, which 
    //triggerOffset changes. So we do a test: we place an element in the center of the screen
    //(windowHeight/2) and check one edge (at elemHeight/2 dist from center), adding offset to
    //elem's top. If top + offset is greater than windowHeight then offset is too large (the element would
    //then be out of view in the center of the screen, which is obviously a bug).
    eca.animatable.getMaxTriggerOffset = function(elem, windowHeight, triggerOffset)
    {
        var elemHeight = 0;
        
        if(elem.bottom && elem.top) 
        {
            elemHeight = elem.bottom - elem.top; 
        }
        else
        {
            elemHeight = elem.getBoundingClientRect().bottom - elem.getBoundingClientRect().top;
        }
        
        var maxTriggerOffset = Math.floor( (elemHeight)/2 + windowHeight/2 ); 
        
        return  triggerOffset > maxTriggerOffset ? maxTriggerOffset : triggerOffset; 
        
    };


    //get duration of animation duration or delay
    //always returns ms value
    eca.animatable.getDurationInMS = function(duration)
    {
        var timeInMilliseconds = 0;
        if (duration.indexOf('ms') !== -1) //duration already in ms
        {
            timeInMilliseconds = parseFloat(duration);
        }
        else if (duration.indexOf('s') !== -1) //duration in seconds
        {
            timeInMilliseconds = parseFloat(duration) * 1000; 
        }
        else // unitless or wrong unit with number so just assume it's in ms
        {
            timeInMilliseconds = parseFloat(duration);
        }
        
        return timeInMilliseconds;
    };
    
    
    //get individual span wrapped letters (with class letter) of a text element
    //function also accounts for nested tags 
    //(e.g., text inside a paragraph tag with nested text inside an anchor tag)
    //this function is needed because when we animate single letters inside some tag
    //(e.g., h2, p, etc), we need to get the children (i.e., single letters wrapped in spans)
    //inside tags, which could themselves be nested tags of some sort
    //
    // @PARAMS
    //    elem: a text node (h1, p, etc) with wrapped (in divs and spans) text
    //   
    // returns: array of spans with class letter, each containing a letter of the text node
    eca.animatable.getLetters = function(elem) // Note: can make fn more general to allow for getting words, lines, or letters
    {
        
        var letters = [];
        var newLetters = [];
        
        if (window.HTMLCollection.prototype.isPrototypeOf(elem.children)) //if children are an html collection
        {
            letters = [].slice.call(elem.children); //so we can iterate over collection
            
            for (var i = 0; i < letters.length; i++)
            {
                if (letters[i].classList[0] === "letter" && letters[i].tagName.toLowerCase() === 'span') 
                {
                    newLetters.push(letters[i]);
                }
                else //get letters inside the tag that is a sibling of but not a span (e.g., more spans inside of the anchor tag that's next to other spans)
                {
                    var tempLetters = eca.animatable.getLetters(letters[i]);
                    
                    if (tempLetters.length > 0) 
                    {
                        newLetters.push.apply(newLetters, tempLetters); //spread out array values and push each into array;
                    }
                   
                }
            }
        }
        
        return newLetters;
    };
    
    //wrap text (p tags, h tags, etc) in divs and spans.
    //words are wrapped in divs, and letters in spans
    //text is wrapped so we can animate single letters or 
    //whole words
    //@PARAMS
    // groupsOfLetters: an array where each element is a 
    // text element of some sort (e.g., h1, p, etc)
    eca.animatable.wrapText = function(groupsOfLetters)
    {
        
        groupsOfLetters.forEach(function(group)
        {
            
            //need to push group to array because fn wraptext expects array of letters
            //and we might call it recursively below
            var wordArray = [];
            wordArray.push(group);
        
            group.setAttribute('aria-label', group.innerText); //set aria-label to be the text of group itself, since individual span wrapped letters will be ignored by screen readers
            
            if (group.innerHTML.match(/<.+?>/g) !== null) //if html has tags in it and not just text, we must rip tags out else the span will wrap around tags too
            {
                //not an exhaustive list of void elems, but commonly used ones. Just for reference since matching /<.+?>/g regex matches those anyway
                //var voidElements = group.innerHTML.match(/<(img|br|\/br|br\/|br \/|hr|input).+?>/g);
                
                var cleanHTML = group.innerHTML.split(/<.+?>/g); // find html tags (eg. <a> <br> etc, within heading or paragraph text) and split remaining text at those tags
                var htmlTags = group.innerHTML.match(/<.+?>/g);
                var newHTML = "";
                
                if ( group.innerHTML.match(/<div/g) === null  ) // if no divs
                {
                    
                    //build new innerHTML from cleanHTML with words wrapped in divs
                    //and htmlTags inserted back into original positions
                    for (var i = 0, j = 0; i < cleanHTML.length; i++)
                    {
                        newHTML += cleanHTML[i].replace(/\S+/g, 
                        '<div class="word" aria-hidden="true" style="position: relative; display: inline-block">$&</div>') + 
                        (typeof htmlTags[j] !== 'undefined' ? htmlTags[j++] : ''); 
        
                    }
                    group.innerHTML = newHTML; //replace group's old innerHtml with the new wrapped one
                    eca.animatable.wrapText(wordArray);
                   
                }
                else //words already wrapped in divs, so wrap letters in spans
                {
                    //same as with divs above but now we wrap each letter in a span
                    for (i = 0, j = 0; i < cleanHTML.length; i++)
                    {
                        newHTML += cleanHTML[i].replace(/\S/g, 
                        '<span class="letter" aria-hidden="true" style="display: inline-block">$&</span>') + 
                        (typeof htmlTags[j] !== 'undefined' ? htmlTags[j++] : ''); 
        
                    }
                    
                     group.innerHTML = newHTML;
                }
                
              
                //need to build string inside newHTML string because once you place a tag into some innerHTML
                //closing tag will automatically be inserted next to it, which isn't what we want. 
               
                
            }
            else // no tags, so just wrap words of text in divs
            {
               
                group.innerHTML = group.innerHTML.replace(/([^\s]+)/g, 
                '<div class="word" aria-hidden="true" style="position: relative; display: inline-block">$&</div>');
                eca.animatable.wrapText(wordArray);
                
            }
            
        });
    
    };
    
    
    //This function is the first step to our animation pipeline.
    //Animating an element on scroll is as simple as defining the
    //animation for the element in css with an .animated (past tense) class.
    //Then we select elements with the .animate (present tense) class,
    //sort them into groups (arrays) of like elements,
    //configure various animation properties for them,
    //and push them into the elementsToAnimate array.
    //The rest of the work is carried out for us by other 
    //animation functions. 
    eca.animatable.readyElementsForAnimation = function()
    {
        
        var elemsToBeAnimated = eca.helperFns.getElementsToArray(".animate"); 
        var classNameOfElements = []; //list of each animatable elements' class name, which serves as identifier for an element group
        var groupOfElements = { }; //elements with same className will be part of same animation timeline
        
        // 1.
        //go through list of elements targeted for animation
        //and sort into like groups (e.g., elements are either 
        //animated as part of a group or alone if it's a single elem)
        for (var i = 0, j = 0; i < elemsToBeAnimated.length; i++)
        {
           
           if (typeof groupOfElements[ elemsToBeAnimated[i].classList[0] ] === "undefined") //if no group with that name exists, start new group of elements with unique group name 
           {
               classNameOfElements.push( elemsToBeAnimated[i].classList[0] ); //add new class-name to list, which is always the first class of the element's classList
               j = classNameOfElements.length - 1; 
               groupOfElements[ classNameOfElements[j] ] = eca.helperFns.getElementsToArray("." + elemsToBeAnimated[i].classList[0]); //new array for new group of elements with same class name
               
               groupOfElements[ classNameOfElements[j] ] = groupOfElements[ classNameOfElements[j] ].filter(function(elem) { return elem.className.indexOf('dont-animate') === -1 }); 
               
               setAnimationProperties(elemsToBeAnimated); //e.g, props for, say, if animations are to be reset when scrolled out, use a stagger delay, etc.. 
               setListeners(groupOfElements[ classNameOfElements[j] ]); //set listeners from user defined json obj in html (e.g., {'"end": "display: inline"'} sets animation/iterationend event listener on elems)
               
           }
           else 
           {
               //do nothing, since this element group is already part of array and the user probably forgot they
               //added them twice
           }
            
        }
        
        // 2. 
        //same as above but now we grab text elements to animate
        var textElements = eca.helperFns.getElementsToArray('.animate-chars');
        eca.animatable.wrapText( textElements ); //group letters of text nodes into word and letters, and wrap each in divs and spans respectively
        
        for (i = 0; i < textElements.length; i++)
        {
            if (typeof groupOfElements[ textElements[i].classList[0] + "-letters" ] === "undefined") 
            {
                classNameOfElements.push( textElements[i].classList[0] + "-letters" ); 
                j = classNameOfElements.length - 1; 
                groupOfElements[ classNameOfElements[j] ] = eca.animatable.getLetters(textElements[i]); 
                
                setAnimationProperties(textElements);
                addUniqueDelays(textElements); //since text is wrapped in new elements after page load, we need to add delays afterwards too
                setListeners(groupOfElements[ classNameOfElements[j] ]);
            }
            else //same class name for group of letters, but it's a new group so push it into it's own array and give unique identifier
            {
                classNameOfElements.push( textElements[i].classList[0] + "-letters" + i ); //add new className to list, i is unique identifier
                j = classNameOfElements.length - 1; 
                groupOfElements[ classNameOfElements[j] ] = eca.animatable.getLetters(textElements[i]); //add new array for new group of elements
                
                setAnimationProperties(textElements);
                addUniqueDelays(textElements);
                setListeners(groupOfElements[ classNameOfElements[j] ]);
            }
            
        }
        
        //finally, place all element groups in array to iterate over
        for (i = 0; i < classNameOfElements.length; i++)
        {
            eca.animatable.elementsToAnimate.push( groupOfElements[ classNameOfElements[i] ].reversed 
            ? groupOfElements[ classNameOfElements[i] ].reverse() : groupOfElements[ classNameOfElements[i] ] );
        }
        
        
        //functions below are private to readyElementsForAnimation
        //since readyElemsForAnimation is only called once (domContentLoaded)
        //the below will only be defined once (reminder: i and j vals as referenced in 
        //each function below will be the values at time of call at that point in 
        //readyElementsForAnimation fn)
        
        //this fn sets properties on elems with corresponding dataset attributes 
        //set for them. fn uses groupOfElements obj and classNameOfElements array defined in
        //enclosing readyElementsForAnimation fn
        function setAnimationProperties(elems) 
        {
            //for getting global properties
            //many properties have the option of setting a global property 
            //while leaving the option to overriding the gloabl setting per element
            var html = document.querySelector("html"); 
            
            //non-numeric keys of array obj are simply skipped over during 
            //iteration and length property ignores them
            groupOfElements[ classNameOfElements[j] ].elemsIdentifier = classNameOfElements[j];  
            groupOfElements[ classNameOfElements[j] ].delayMultiplier = eca.animatable.getDurationInMS(elems[i].dataset.ecaStagger || html.dataset.ecaStagger || "0ms"); //delay multiplier for staggered delay
            groupOfElements[ classNameOfElements[j] ].delayFromZero = typeof elems[i].dataset.ecaStaggerFromZero !== "undefined" ? (elems[i].dataset.ecaStaggerFromZero.trim().toLowerCase() === "false" ? false : true) : 
            (typeof html.dataset.ecaStaggerFromZero !== "undefined" ? 
            (html.dataset.ecaStaggerFromZero.trim().toLowerCase() === "false" ? false : true) : false); //setting this option will include zero as first multiple of delayMultiplier
            
            groupOfElements[ classNameOfElements[j] ].duration = eca.animatable.getDurationInMS(elems[i].dataset.ecaDuration || "0ms"); //duration of animation
            groupOfElements[ classNameOfElements[j] ].groupDelay = eca.animatable.getDurationInMS(elems[i].dataset.ecaGroupDelay || "0ms"); //delay for group of elements as a whole
            
            groupOfElements[ classNameOfElements[j] ].finishedAnimating = false; 
            groupOfElements[ classNameOfElements[j] ].numAnimated = 0; //so we can know when elems are finished animating
            groupOfElements[ classNameOfElements[j] ].playOnLoad = typeof elems[i].dataset.ecaPlayOnLoad !== "undefined" ? (elems[i].dataset.ecaPlayOnLoad.trim().toLowerCase() === "false" ? false : true) : 
            (typeof html.dataset.ecaPlayOnLoad !== "undefined" ? (html.dataset.ecaPlayOnLoad.trim().toLowerCase() === "false" ? false : true) : false); //play animation right away when page loads instead of on scroll
            
            groupOfElements[ classNameOfElements[j] ].animateAllOnFirstSight = typeof elems[i].dataset.ecaAnimateAllOnFirstSight !== "undefined" ? 
            (elems[i].dataset.ecaAnimateAllOnFirstSight.trim().toLowerCase() === "false" ? false : true)  : 
            (typeof html.dataset.ecaAnimateAllOnFirstSight !== "undefined" ? 
            (html.dataset.ecaAnimateAllOnFirstSight.trim().toLowerCase() === "false" ? false : true) : false); //if one element is in view, animate all regardless if user can see rest 
            
            groupOfElements[ classNameOfElements[j] ].animateAllOnFirstSight = groupOfElements[ classNameOfElements[j] ].playOnLoad ? !groupOfElements[ classNameOfElements[j] ].playOnLoad :
            groupOfElements[ classNameOfElements[j] ].animateAllOnFirstSight; //because playOnLoad and animateAll options are mutually exclusive 
            
            groupOfElements[ classNameOfElements[j] ].listen = elems[i].dataset.ecaListen; //event listeners and callbacks for animation start, end, iteration, cancel. 
            groupOfElements[ classNameOfElements[j] ].capture = typeof elems[i].dataset.ecaCapture !== "undefined" ?  
            (elems[i].dataset.ecaCapture.trim().toLowerCase() === "false" ? false : true) : false; //can set capture to true if user wants event listener to fire during capture phase
            
            groupOfElements[ classNameOfElements[j] ].offset = typeof elems[i].dataset.ecaOffset !== "undefined" ? elems[i].dataset.ecaOffset : 
            typeof html.dataset.ecaOffset !== "undefined" ? html.dataset.ecaOffset : 0; //user defined offset (pixel offset for animation trigger point). 
            
            groupOfElements[ classNameOfElements[j] ].offset = parseInt(groupOfElements[ classNameOfElements[j] ].offset, 10) === parseInt(groupOfElements[ classNameOfElements[j] ].offset, 10) 
            ? parseInt(groupOfElements[ classNameOfElements[j] ].offset, 10) : 0; //check offset for NaN
            
            groupOfElements[ classNameOfElements[j] ].animateWithTransitions = typeof elems[i].dataset.ecaAnimateWithTransitions !== "undefined" ? (elems[i].dataset.ecaAnimateWithTransitions.trim().toLowerCase() === "false" ? false : true) :
            (typeof html.dataset.ecaAnimateWithTransitions !== "undefined" ? 
            (html.dataset.ecaAnimateWithTransitions.trim().toLowerCase() === "false" ? false : true) : false); //need to know this so we know what type of delay to set, animation vs transition delay
            
            groupOfElements[ classNameOfElements[j] ].removeAnimationWhenNotInView = typeof html.dataset.ecaRemoveAnimationWhenNotInView !== "undefined" ? 
            (html.dataset.ecaRemoveAnimationWhenNotInView.trim().toLowerCase() === "false" ? false : true) : false; // global option, removes animation when not in view so element can animate again when in view
            
            //can't actually reverse array here since elements with class animated are gathered one
            //at a time into new array and this fn is called only after first elem is inserted
            groupOfElements[ classNameOfElements[j] ].reversed = typeof elems[i].dataset.ecaReverse !== "undefined" ? 
            (elems[i].dataset.ecaReverse.trim().toLowerCase() === "false" ? false : true) : false; 

            //for below, use an eventListener to do something at animation end, start, or track with custom function, not set here but user defined in own javascript file
            //on elements of choice, must be called trackingFn
            // groupOfElements[ classNameOfElements[j] ].trackingFn 
            
        }
        
        //text is split dynamically on page load (each letter 
        //wrapped in span with class .letter), so here we must
        //add the unique delays for each element after they're placed
        //on page. (note: this fn doesn't actually set the delay, just
        //adds the dataset.ecaDelay prop so it can later be set in the 
        //setAnimationDelay fn, which reads that prop). 
        function addUniqueDelays(textElems)
        {
            if (textElems[i].dataset.ecaCharDelays)
            {
                try //to parse JSON object
                {
                    var delaysObj = JSON.parse(textElems[i].dataset.ecaCharDelays);
                    var textLetters = [].slice.call(textElems[i].querySelectorAll(".letter")); 
                    
                    for (var k in delaysObj)
                    {
                        if ( delaysObj.hasOwnProperty(k) && (k-1 <= textLetters.length) )
                        {
                            textLetters[k-1].dataset.ecaDelay = delaysObj[k]; //k-1 because we assume char count starts at one
                        }
                    }
                }
                catch (error)
                {
                    console.error(error);
                    console.error("Please make sure the data-eca-char-delays object on " + classNameOfElements[j] + " is properly formatted JSON.");
                }
                
            }
            
        }
        
        //set styles on elems at some point in animation
        //e.g., start, end, iteration
        function setStyles(elems, stylesToChange, event)
        {
            var currentStyles = elems.getAttribute("style");
            var newStyles = stylesToChange[event];
            
            elems.setAttribute("style", currentStyles + " ; " + newStyles); 
            
        }
        
        //set event listener on animatable elems which sets styles at some point in animation/transition
        function setListeners(elems)
        {
            if (elems["listen"]) //if user set event listeners on elems via data.listen attribute
            {
                try //to parse listen obj
                {
                    var stylesToChange = JSON.parse(elems["listen"]);
                    var eventTypes = getEventTypes(stylesToChange, elems); 
                    
                    for (var event in eventTypes)
                    {
                        if (eventTypes.hasOwnProperty(event))
                        {
                            (function(event)
                            {
                                eca.helperFns.listenOnAllElems(elems, eventTypes[event], function listenerCb(e)
                                {
                                    if (this === e.target) //because the capture/bubbling phase could trigger the same event but on different element which we don't want
                                    {
                                        
                                        setStyles(this, stylesToChange, event);
                                        
                                    }
                                    
                                }, elems["capture"]);
                                
                            })(event);
                        }
                    }
                    
                }
                catch (error)
                {
                    console.error(error);
                    console.error("Please make sure the data-eca-listen object on " + elems.elemsIdentifier + " is properly formatted JSON.");
                }
            }
            
        } //setListeners()
        
        
        //@PARAMS
        // --fnsToRun: object with keys representing event listeners to be set
        // --elems: array of elements to set listeners on
        //returns: eventsTypes obj with string values for transition or animation events 
        function getEventTypes(stylesToChange, elems)
        {
            var eventTypes = {};
            
            for (var event in stylesToChange)
            {
                if (stylesToChange.hasOwnProperty(event) && event !== "run" && event !== "iteration")
                {
                    eventTypes[event] = elems.animateWithTransitions ? "transition" + event : "animation" + event; 
                }
                else if (stylesToChange.hasOwnProperty(event) && event === "run")
                {
                    eventTypes[event] = "transitionrun";
                }
                else if (stylesToChange.hasOwnProperty(event))
                {
                    eventTypes[event] = "animationiteration"; 
                }
            }
            
            return eventTypes; 
            
        }
        
        
    }; //eca.animatable.readyElementsForAnimation()
    
    
    //fn helps to assist user in grabbing a specific element group 
    //from the eca.animatable.elementsToAnimate array.
    //not used in the app here but useful if user wants to provide their
    //own tracking function for some elem array in eca.animatable.elementsToAnimate 
    eca.animatable.getElementArray = function(elemsIdentifier)
    {
        var elementGroup = [];
        
        eca.animatable.elementsToAnimate.forEach(function(elemArr)
        {
            if(elemArr["elemsIdentifier"] === elemsIdentifier)
            {
                elementGroup = elemArr; 
            }
        });
        
        return elementGroup; 
    };
    
    
    //this is mainly called via scroll event listener on window to 
    //see if animations should be played yet (i.e., if a group of elements
    //meets certain conditions)
    eca.animatable.requestAnimationUpdate = function()
    {
        //need to check if updating because scroll and resize listeners use this handler and both
        //can fire at the same time on resize events, giving us two updates in the same frame
        if(!eca.appState.updating) 
        {
            eca.appState.updating = true; 
            
            eca.animatable.elementsToAnimate.forEach(
            
                eca.animatable.ifElemsNeedAnimating.bind(null, eca.animatable.setDynamicAnimationProps)
                           
            ); //do batch reading of all elem coords  
            
            //do batch writing (change styles, add animation class, etc) at frame end
            //which avoids style conflicts with, for instance, any event listeners set that change styles
            requestAnimationFrame(eca.animatable.updateAnimations);
            
            //the read all then write all pattern above is used to avoid layout thrashing and 
            //unnecessary updates
            
        }
       
    };
    

    eca.animatable.updateAnimations = function()
    {
    
        eca.animatable.elementsToAnimate.forEach(
                
            eca.animatable.ifElemsNeedAnimating.bind(null, eca.animatable.animate) 
                
        ); 
          
        eca.appState.updating = false; 
                
    };
    
    //another one-liner, just so we're not redefining functions on scroll each time
    //(same reason I'm using partial applications for this inside forEach loops)
    eca.animatable.ifElemsNeedAnimating = function(func, elems)
    {
        //only check if elems.finshedAnimating if removeAnimation is false because removing animation gives elems chance to animate again
        if ( (elems.removeAnimationWhenNotInView || !elems.finishedAnimating) && !elems.currentlyDelaying)//currently delayed elems have had all processing done on them already and are awaiting animation
        {
            
            func(elems);
        
        }
        
    };
    
    
    //@Params
    // elem: one element of a group of related elements that have an animation attached to them
    // animationDelay: this is a staggered delay, calculated by multiplying delayMuliplier by index i
    // it's the default delay method used for animations in this app 
    eca.animatable.setAnimationDelay = function(elem, animationDelay) 
    {
        //individual elems can also have a unique delay whether using staggered or constant delays
        var delay = typeof elem.dataset.ecaDelay !== "undefined" ? eca.animatable.getDurationInMS(elem.dataset.ecaDelay) + "ms" : animationDelay + "ms";
        
        elem.delay = delay || 0 + "ms"; //store delay in variable so we don't cause a style recalc here
        
    };
    
    
    //calc dynamic elem properties like position (to see if elem in view)
    //and animation delay, which can change based on order of elems in a group
    //and whether previous elems have been animated already or not
    eca.animatable.setDynamicAnimationProps = function(elems)
    {
        elems.visible = false; 
        
        for ( var i = 0; i < elems.length; i++)
        {
            if (!elems.playOnLoad) //because if we play animation on page load we don't care about element coordinates
            {
                eca.animatable.elementInView(elems[i], elems.offset); 
            }
            
            if (!elems.visible && elems[i].inView || elems.playOnLoad)
            {
                //need to know if any part of elem group is visible (i.e., if any one elem is visible)
                //so we know whether to use groupDelay in animate fn or not
                elems.visible = true; 
            }
         
        }
        
        var delayMultiplier = elems.delayMultiplier; 
        
        //Garbage values such as " " will not affect animation delay set via style attribute
        //since it's not a valid value, e.g., style="animation-delay=' ms'" does nothing, which we want if delayMult is 0
        //meaning user has set a constant delay via css or doesn't want one
        var animationDelay = delayMultiplier > 0 ? (elems.delayFromZero ? 0 : delayMultiplier) : " "; 
        
        for ( var i = (elems.delayFromZero ? 0 : 1), j = 0;
            j < elems.length; j++, animationDelay = delayMultiplier > 0 ? delayMultiplier * i : " ") 
        {
            
            if ( (elems[j].inView || elems.playOnLoad || ( elems.animateAllOnFirstSight && elems.visible ) ) && !elems[j].animated ) 
            {
            
                //var encapsulates if logic of current block
                //used so we don't have to repeat in animate fn and to be more explicit what's going on 
                elems[j].readyToAnimate = true; //set here because if elem if ready to have animation delay set, it's ready to animate
                eca.animatable.setAnimationDelay(elems[j], animationDelay);
                i++; 
                
            }
            else 
            {
                elems[j].readyToAnimate = false;
            }
           
        }  
    
    };
    
    //add class animated with css animation defined for array of elems,
    //(or remove class if element is below viewport out-of-sight), and 
    //potentially do some work on them with a custom function (if user defined one)
    eca.animatable.animate = function(elems) 
    {
        //here we delay elem group before we animate any of the elems
        if ( elems.groupDelay > 0 && elems.visible )
        {
            elems.currentlyDelaying = true;
            elems.groupDelayOriginal = elems.groupDelay; //save delay before setting to zero
           
            elems.delayId = setTimeout(function delayGroup()
            {
                
                eca.animatable.setDynamicAnimationProps(elems); //get possible new positions for elems (user could've scrolled since delay start)
                
                //set groupDelay to 0 since groupDelay is only supposed to 
                //be applied once to all elems as a whole
                //and subsequent calls to animate, for unanimated elems in
                //elems array, shouldn't delay as group again
                elems.groupDelay = 0; 
                     
                requestAnimationFrame(function animateAfterDelay() //jump out of this drawn out frame and animate in next
                {
                   eca.animatable.animate(elems);
                   
                   elems.currentlyDelaying = false;
                });
               
            }, elems.groupDelay);
            
            //below is useful if user uses trackingFn on elems and needs to 
            //cancel the elems' delay
            eca.appState.groupDelayIds.push({elemsDelaying: elems.elemsIdentifier, delayId: elems.delayId}); 
           
        }
        else //no group delay, animate right away
        {
            //track animated elems 
            //for purpose of running some cleanup or tracking function on 
            //them 
            var newlyAnimatedElems = []; 
            
            //used when calculating when to remove animation (user defined).
            //we only want to use an offset if we're using transitions, since animations
            //will simply disappear when we remove them (revert to original state, say, with opacity 0)
            //while transitions will transition back to their original state
            var animateOutOffset = elems.animateWithTransitions ? 
            eca.animatable.getMaxTriggerOffset(elems[0], eca.appState.windowHeight, elems.offset) : 0; 
            
            for (var i = 0; i < elems.length; i++)
            {
                //a variety of factors can make an element ready to animate or not (but mostly it's when an elem comes into view)
                //see setDynamicAnimationProps function to see complete logic for readyToAnimate
                if ( elems[i].readyToAnimate )   
                {
                    //if delay is undefined, style.animation/transitionDelay will stay unaltered
                    if (elems.animateWithTransitions)
                    {
                        elems[i].style.transitionDelay = elems[i].delay;
                    }
                    else
                    {
                        elems[i].style.animationDelay = elems[i].delay; 
                    }
                    elems[i].classList.add('animated');
                    newlyAnimatedElems.push(elems[i]);
                    elems[i].animated = true; 
                    elems[i].readyToAnimate = false; //because it's animated, hence not readyToAnimate anymore
                    elems.numAnimated++; 
                    
                }//below the !elem.inView && elem.top etc is a special case of an elem not being in view (i.e., viewport is above the element)
                else if ( ( !elems[i].inView && elems[i].top + animateOutOffset > eca.appState.windowHeight ) && !elems.playOnLoad && !elems.animateAllOnFirstSight && elems[i].animated) 
                {
                   
                    elems[i].classList.remove('animated');
                    elems[i].animated = false;
                    elems[i].style = "";
                    elems.numAnimated--; 
                   
                }
                else if (elems.animateAllOnFirstSight && elems.removeAnimationWhenNotInView && elems[i] === (elems.reversed ? elems[elems.length-1] : elems[0]) 
                && (!elems[i].inView && elems[i].top + animateOutOffset > eca.appState.windowHeight) && elems.finishedAnimating)
                {
                   
                    elems.forEach(function(elem) //remove animation for all elems in group when first elem goes out of view
                    {
                        elem.animated = false;
                        elem.style = "";
                        elem.classList.remove("animated");
                        elems.numAnimated--;
                    });
                    
                }
                
            }
            
            if (0 === elems.numAnimated) 
            {
                //reset groupDelay because we may have come out of group delay with canceled animation (and it's set to 0 there)
                //or user may have set removeAnimationWhenNotInView option which gives elems chance to animate again
                elems.groupDelay = elems.groupDelay || elems.groupDelayOriginal; 
                elems.finishedAnimating = false; //useful when removeAnimation option set
               
            }
            else if (elems.length === elems.numAnimated)
            {
                //so we don't run animate function on these elems again
                elems.finishedAnimating = true; 
                
            }
            
            //run a custom function with callback on animated elems if user defined one
            if (elems.trackingFn &&  newlyAnimatedElems.length > 0)
            {
                elems.trackingFn(newlyAnimatedElems);
                
            }
           
             
        }
            
    };
    
    /*
        SETUP APP LISTENERS
    ===============================================================
    */
    
    
    //when DOM and all other resources are finished loading
    eca.readyAll(function runAnimationsOnload()
    {
        
        eca.animatable.requestAnimationUpdate(); //animate elements in view (note: readyElementsForAnimation called by this point)
        
        setTimeout(function()
        {
            
            var html = document.querySelector('html'); 
            //need this to prevent page jumping to right on reload.
            //page may jump to right (even with overflow-x: hidden, browser dependent) because user may have absolutely positioned elements off screen to left and right that 
            //animate back to center on scroll. We need all three below because certain broswers will only work with a certain one in exclusion of the rest 
            //(e.g., for ie only document.body works; the rest are ignored);
            html.scrollLeft = 0; 
            document.documentElement.scrollLeft = 0; 
            document.body.scrollLeft = 0; 
            
            
        }, 100); //need to wrap in setTimeout because page will jump (not all browsers but some) fraction of sec after load and after scrollLeft set to 0; 
        //100ms above is a bit arbitrary since page could jump more than a 100ms after load, but for most browsers/different loads tested this works fine
    });
    
    //when DOM is finished loading
    eca.ready(function animateVisibleElemsOnScroll()
    {
        //grab all elems that have animations attached to them
        //and set some initial animation properties for them
        eca.animatable.readyElementsForAnimation(); 
        
        //add animations to elements when in view or based on other conditions defined by user
        eca.helperFns.listenOnElem(window, 'scroll', eca.animatable.requestAnimationUpdate);
    });
    
    eca.ready(function onResize()
    {
        var html = document.querySelector('html'); 
        
        eca.helperFns.listenOnElem(window, 'resize', eca.helperFns.throttle(function()
        {
            eca.appState.windowHeight = window.innerHeight; //update windowHeight on screen resize
            //in case screen jumps to right on resize,
            //which can happen if there are elements off screen 
            //waiting to be animated
            html.scrollLeft = 0;
            document.documentElement.scrollLeft = 0; 
            document.body.scrollLeft = 0; 
            
        }), 150);
        
        //play animations for newly visible elements
        eca.helperFns.listenOnElem(window, 'resize', eca.animatable.requestAnimationUpdate); 
    }); 
    
    
   
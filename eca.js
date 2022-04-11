/*

Welcome to the source code for Enhanced/Easier CSS Animations (ECA)! 

I had the idea for this app while working on previous sites,
which had a lot of animation code. I was
spending a bit too much time on animation work, so I came up with
the idea for how to simplify dynamically adding animations 
to elements (mostly on scroll when they appeared).

Whether you're using an animation library, or making animations yourself,
most code for selecting elements and animating them takes the following form,
which can span many hundreds of lines: 

var element1 = document.querySelectorAll('.element1').
element1.addSetupPropertiesToElements(prop1: 'property 1', prop2: etc...);
var element2 = document....
element2.addSetupPropertiesToElements(prop1: ...)
var element50 = document.... etc... 
And even more code to group them together into timelines if needed... 

With this library there's no more of that! 

The main bulk of the functionality for this app
is found in the readyElementsForAnimation 
function and the functions it calls, where
most of the above code is automated. 

*/

    const eca = {
    
        ready: callback =>
        {
            if (document.readyState !== 'loading')
            {
                callback();
            } 
            else 
            {
                document.addEventListener('DOMContentLoaded', callback);
            } 
        },
        animatable: { elementsToAnimate: [] },
        appState: { windowHeight: window.innerHeight,  // so we can use this in scroll handlers without querying it every time (only updated on resize events)
                    updating: false, // so when scroll and resize events fire in same frame animations don't update twice
                    groupDelayIds: {}, // for canceling setTimeouts used in app to handle delaying animations for groups of elements
                    throttleLim: {resize: null, scroll: null}
        },
        helperFns: {}

    };
    
    
    /* HELPER FUNCTIONS
    ===================================================================*/
    
    // generic event listener for a single DOM obj
    // @param {(Object | String)} - obj event listener should listen on
    // @param {Event} event - event to listen for
    // @param {Function} callback - func to run when event fires
    // @param {Boolean} once - when true listener fires once and then is removed
    eca.helperFns.listen = (obj, event, callback, once) =>
    {
        obj = typeof obj === 'string' ? document.querySelector(obj) : obj;
        obj.addEventListener(event, callback, {once: once});
    };
    
    // event listener for array of DOM objs
    eca.helperFns.listenAll = (objs, event, callback, once) =>
    {
        objs = typeof objs === 'string' ? document.querySelectorAll(objs) : objs;
        objs.forEach(obj =>
        {
            eca.helperFns.listen(obj, event, callback, once); 
        });
    };
    
    // standard throttle.
    // The last event to come in while function is in throttle
    // is processed after throttle limit expires.
    // @param {Function} func - func to run after throttle limit expires
    // @param {Number} limit - how long to wait before running func again
    // @returns {Function} throttleHandler 
    eca.helperFns.throttle = (func, limit) =>
    {
        
        let inThrottle = null;
        let event = null; 
        
        // closure that implements throttle functionality. If an event
        // was fired while in a previous throttle, that event
        // is processed by the handler after the previous throttle
        // limit expires. 
        // @param {Event (Object)} e - event to be passed to throttleHandler and
        //     applied to func. Set equal to outer scope's event variable 
        //     so we can track new events coming in while previous throttler 
        //     is still running. 
        const throttledHandler = function(e) 
        {
            const args = arguments;
            const context = this;
            
            event = e; 
            
            if (!inThrottle) 
            {
                func.apply(context, args); 
                event = null; 
                
                inThrottle = setTimeout(() =>
                {
                    inThrottle = null; 
                    
                    if (event) 
                    {
                        throttledHandler(event);
                    }
                  
                }, limit); 
            }
        
        };
        
        return throttledHandler; 
    };
    
    /* ANIMATION FUNCTIONS
    ==============================================================*/
    
    // custom properties each elem needs
    // for ECA to work. Also helps avoid potential
    // naming clashes with other libraries
    // or native html element props. 
    // @param {HTML Element} elem 
    // @param {ECA ElemGroup} elemGroup 
    eca.animatable.initializeElemProps = (elem, elemGroup) =>
    {
        const transitionBackOffset = elemGroup.animateWithTransitions ? elemGroup.offset : 0; 
        
        // add to ecaElemProps obj 
        // so we don't clash with
        // names (or future prop names) 
        // on given elem interface. 
        elem.ecaElemProps = {
            top: null,
            bottom: null,
            delay: 0,
            inView: false,
            readyToAnimate: false,
            animated: false,
            /*
                It may seem counterintuitive to have a var that 
                lets us know when an elem is out of view, instead of just
                using ! inView. However, the app decouples the in view
                and not in view logic through the various options offered to users.
                
                For instance, we want to consider offset (for elements using animations)
                when deciding when they come into view, but not when they go out of view. 
                This is because animations simply revert/snap back to their original state
                instead of reverting smoothly like transitions do. Hence we have to have separate
                logic for when elems with animations attached leave the viewport. 
                
                Also, the users can choose when the animation will be removed from an element
                by specifying one of three options for removeAnimationWhenNotInView (e.g., do
                we want to remove the animation when the element is above or below the viewport,
                or just below?). 
            */
            get atRemoveAnimationPoint()
            {
                if (elemGroup.removeAnimationWhenNotInView && elemGroup.removeAnimationWhenNotInView === true)
                {
                    return this.top + transitionBackOffset >= eca.appState.windowHeight || this.bottom - transitionBackOffset <= 0;
                }
                else if (elemGroup.removeAnimationWhenNotInView === "below") // when elem below viewport
                {
                    return this.top + transitionBackOffset >= eca.appState.windowHeight;
                }
                else if (elemGroup.removeAnimationWhenNotInView === "above")
                {
                    return this.bottom - transitionBackOffset <= 0;
                } 
            }
        };
    };
    
    // This class makes us an extension of Array but with useful 
    // props ECA uses to operate. 
    // @param {HTML Element} elem - first elem of a group we want to animate
    //     (or parent element of text group we want to animate)
    //     with useful dataset props for entire group.
    // @param {String} groupId - id ECA uses to uniquely identify group
    // @constructor -- sets custom properties on new ElemGroup.
    eca.animatable.ElemGroup = function(elem, groupId)
    {
        // Get html so we can set global properties.
        // Many properties have the option of setting a global property 
        // while leaving the option to overriding the gloabl setting per element
        const html = document.querySelector("html"); 
        
        const elemGroup = elem.classList.contains("eca-animate-chars") 
            ? 
                elem.getElementsByClassName("letter")
            : 
                elem.parentElement.getElementsByClassName( elem.classList[0] );
        
        this.groupId = groupId; 
        this.delayMultiplier = eca.animatable.getDurationInMS(elem.dataset.ecaStagger || html.dataset.ecaStagger || "0ms"); // for staggered delay
        
        // setting this option will include zero as first multiple of delayMultiplier
        this.delayFromZero = typeof elem.dataset.ecaStaggerFromZero !== "undefined" 
            ? 
                (elem.dataset.ecaStaggerFromZero.trim().toLowerCase() === "false" ? false : true) 
            : 
                (typeof html.dataset.ecaStaggerFromZero !== "undefined" 
                    ? 
                        (html.dataset.ecaStaggerFromZero.trim().toLowerCase() === "false" ? false : true) 
                    : 
                        false
                ); 
        
        // duration of animation, not used in app but useful 
        // if user wants to get the duration of the animation
        // for custom tracking function without causing a style
        // recalc. 
        this.duration = eca.animatable.getDurationInMS(elem.dataset.ecaDuration || "0ms"); 
        
        // delay before any one elem of group animates (distinct from a css animation-delay). 
        this.groupDelay = eca.animatable.getDurationInMS(elem.dataset.ecaGroupDelay || "0ms"); 
        
        // Save group delay so if removeAnimationWhenNotInView
        // prop is set we can still have original delay,
        // which is set to 0 once initial animation is completed. 
        // Could keep groupDelay always set, but then elems in 
        // a group that haven't animated yet will trigger
        // another group delay. 
        this.groupDelayOriginal = this.groupDelay;  
        
        // so we know not to run elements delaying through
        // animation functions again. 
        this.currentlyDelaying = false;
        
        // setTimeout id of a groupDelayed group.
        // never used in the app but if the user
        // wants to write some custom code, they may
        // need this value. 
        this.delayId = null; 
        this.finishedAnimating = false; 
        
        // so we can know when elems are finished animating
        this.numAnimated = 0; 
        
        // Play animation right away when page loads instead of on scroll.
        // This is how css animations normally work. Basically, this tells ECA
        // not to bother with scroll behavior, though we could still use ECA
        // for delays. 
        this.playOnLoad = typeof elem.dataset.ecaPlayOnLoad !== "undefined" 
            ? 
                (elem.dataset.ecaPlayOnLoad.trim().toLowerCase() === "false" ? false : true) 
            : 
                (typeof html.dataset.ecaPlayOnLoad !== "undefined" 
                    ? 
                        (html.dataset.ecaPlayOnLoad.trim().toLowerCase() === "false" ? false : true) 
                    : 
                        false
                ); 
                
        // Should last element of group be first elem of animation or not?
        // This option matters, for example, if we've set a staggered delay. 
        this.playReversed = typeof elem.dataset.ecaReverse !== "undefined" 
            ? 
                (elem.dataset.ecaReverse.trim().toLowerCase() === "false" ? false : true) 
            : 
                false; 
        
        // If one element is in view, we animate all of the group regardless if user can see rest.
        // Can be useful, for example, for title text of a section that wraps lines.
        this.animateAllOnFirstSight = typeof elem.dataset.ecaAnimateAllOnFirstSight !== "undefined" 
            ? 
                (elem.dataset.ecaAnimateAllOnFirstSight.trim().toLowerCase() === "false" ? false : true)  
            : 
                (typeof html.dataset.ecaAnimateAllOnFirstSight !== "undefined" 
                    ? 
                        (html.dataset.ecaAnimateAllOnFirstSight.trim().toLowerCase() === "false" ? false : true) 
                    : 
                        false
                ); 
        
        // because playOnLoad and animateAll options are mutually exclusive 
        this.animateAllOnFirstSight = this.playOnLoad ? false : this.animateAllOnFirstSight; 
        
        // event listeners with associated styles to change on animation start, end, iteration, cancel. 
        this.listen = elem.dataset.ecaListen; 
        
        // fire event listener once then remove it. 
        this.listenOnce = typeof elem.dataset.ecaListenOnce !== "undefined" 
            ?  
                (elem.dataset.ecaListenOnce.trim().toLowerCase() === "false" ? false : true) 
            : 
                false; 
                
        // user defined offset (pixel offset for animation trigger point).
        this.offset = typeof elem.dataset.ecaOffset !== "undefined" 
            ? 
                elem.dataset.ecaOffset 
            : 
                (typeof html.dataset.ecaOffset !== "undefined" 
                    ? 
                        html.dataset.ecaOffset 
                    : 
                        0
                );  
                
        // check offset for NaN
        this.offset = parseInt(this.offset, 10) === parseInt(this.offset, 10) 
            ? 
                parseInt(this.offset, 10) 
            : 
                0; 
                
        this.offset = eca.animatable.getMaxTriggerOffset(elemGroup[0], eca.appState.windowHeight, this.offset); 
        
        // need to know this so we know what type of delay to set, animation vs transition delay
        this.animateWithTransitions = typeof elem.dataset.ecaAnimateWithTransitions !== "undefined" 
            ? 
                (elem.dataset.ecaAnimateWithTransitions.trim().toLowerCase() === "false" ? false : true) 
            :
                (typeof html.dataset.ecaAnimateWithTransitions !== "undefined" 
                    ? 
                        (html.dataset.ecaAnimateWithTransitions.trim().toLowerCase() === "false" ? false : true) 
                    : 
                        false
                ); 
        
        // global option, removes animation when element is not visible so element can animate again when visible.
        // Can take one of four values: false, true, above or below. When true, the animation is reset when elem
        // is out of view above or below the viewport. When below is set, the animation is only reset when the elem
        // is below the viewport, not above--vice versa for when above is set. 
        this.removeAnimationWhenNotInView = typeof html.dataset.ecaRemoveAnimationWhenNotInView !== "undefined" 
            ? 
                (html.dataset.ecaRemoveAnimationWhenNotInView.trim().toLowerCase() === "false" 
                    ? 
                        false
                    : 
                        (html.dataset.ecaRemoveAnimationWhenNotInView.trim().toLowerCase() === "above" ||
                        html.dataset.ecaRemoveAnimationWhenNotInView.trim().toLowerCase() === "below" 
                            ?
                                html.dataset.ecaRemoveAnimationWhenNotInView.trim().toLowerCase()
                            :
                                true)
                )
            : 
                false; 
        
        // need to know if any part of elem group is visible (i.e., if any one elem is visible)
        // so we know whether to use groupDelay in animate fn or not
        this.visible = this.playOnLoad ? true : false; 
       
        // Below, we can use an eventListener to do something at animation end, start, or track with custom function.
        // Not set here but user defined in own javascript file
        // on elements of choice. Must be called trackingFn. 
        this.trackingFn = null; 
        
        for (let i = 0; i < elemGroup.length; i++)
        {
            // Object.assign so we don't create circular reference from elem back to 
            // its group.
            eca.animatable.initializeElemProps( elemGroup[i], Object.assign({}, this) ); 
        }
        
        // so we can access all the ElemGroup properties 
        // right on the array. 
        Array.prototype.push.apply(this, elemGroup); 
    };
    
    // so we can use any array methods we may
    // need on our constructed array.
    // Reminder: filter, map, and fns that return a new array 
    // won't return our custom array props. Also, it's not a true 
    // sub class of Array as you can't increase the length of the Array
    // by assigning to undefined indices.
    eca.animatable.ElemGroup.prototype = Object.create(Array.prototype);
    
    // for when animateAllOnFirstSight option is set with removeAnimation
    // option. Since animateAllOnFirstSight animates the group as a whole, 
    // removing the animation has to consider the group as a whole as well,
    // and not any one element. 
    eca.animatable.ElemGroup.prototype.atRemoveAnimationPoint = function()
    {
            // we only want to use an offset if we're using transitions, since animations
            // will simply disappear when we remove them (revert to original state, say, with opacity 0)
            // while transitions will transition back to their original state (reversing animation 
            // direction does not work).
            const transitionBackOffset = this.animateWithTransitions 
                ? 
                    this.offset
                : 
                    0; 
                    
            let atRemoveAnimationPoint = false;
            
            if (this.animateAllOnFirstSight && this.removeAnimationWhenNotInView)
            {
                // true removes animation when group is above or below viewport,
                // so we have to consider element group like a single element 
                // (i.e., it's top is elems[0].top and bottom is elems[elems.length -1].bottom)
                if (this.removeAnimationWhenNotInView === true) 
                {
                    // not using ecaElemProps.atRemove.. here because that considers each side of elem
                    // and here we need only one. 
                    atRemoveAnimationPoint = this[this.playReversed ? this.length - 1 : 0].ecaElemProps.top + transitionBackOffset >= eca.appState.windowHeight 
                        || this[this.playReversed ? 0 : this.length - 1].ecaElemProps.bottom - transitionBackOffset <= 0;
                    
                }
                else if (this.removeAnimationWhenNotInView === "below")
                {
                    atRemoveAnimationPoint = this[this.playReversed ? this.length - 1 : 0].ecaElemProps.atRemoveAnimationPoint; 
                }
                else if (this.removeAnimationWhenNotInView === "above")
                {
                    atRemoveAnimationPoint = this[this.playReversed ? 0 : this.length - 1].ecaElemProps.atRemoveAnimationPoint; 
                }
            }
            
            return atRemoveAnimationPoint;
    };
    
    eca.animatable.ElemGroup.prototype.constructor = eca.animatable.ElemGroup; 
    
    // text is split dynamically on page load (each letter 
    // wrapped in span with class .letter), so here we must
    // add the unique delays for each element after they're placed
    // on page. (note: this fn doesn't actually set the delay, just
    // adds the dataset.ecaDelay prop so it can later be set, which we do 
    // so we don't cause a style recalc at an inappropriate time). 
    // @param {HTML Element} textElem - some html element containing innerText
    eca.animatable.addUniqueDelays = textElem =>
    {
        if (textElem.dataset.ecaCharDelays)
        {
            try // to parse JSON object
            {
                const delaysObj = JSON.parse(textElem.dataset.ecaCharDelays);
                const textLetters = textElem.querySelectorAll(".letter");
                
                for (let k in delaysObj)
                {
                    if ( delaysObj.hasOwnProperty(k) && (k-1 <= textLetters.length) )
                    {
                        // k-1 because we take the perspective of a user
                        // reading some text in the html, where it's more
                        // natural to talk about the first char of a title/para/etc, 
                        // rather than char zero. 
                        textLetters[k-1].dataset.ecaDelay = delaysObj[k]; 
                    }
                }
            }
            catch (error)
            {
                console.error(error);
                console.error("Please make sure the data-eca-char-delays object on " +
                    textElem.classList[0] + " is properly formatted JSON.");
            }
            
        }
        
    };
    
    // set styles on elem at some point in animation
    // e.g., start, end, iteration
    // @param {HTML Element} elem 
    // @param {String} newStyles - represents inline styles to set on elem.
    eca.animatable.setStyles = (elem, newStyles) =>
    {
        const currentStyles = elem.getAttribute("style");
        
        // can't set styles here via rAF like we do inside requestAnimationUpdate fn
        // because if event handler code ran at the same place in the frame's life cycle
        // we could run into a situation where we're trying to remove the animation from 
        // the element but then right after the hanlder code runs and sets some new style 
        // that makes it appear the element is stuck in its final animationend state. 
        elem.setAttribute("style", currentStyles + " ; " + newStyles);  
        
    };

    // set event listener on animatable elems 
    // with handler that sets styles at some point in animation/transition.
    // @param {ECA ElemGroup} - array of elements with props ECA uses
    eca.animatable.setListeners = elemGroup =>
    {
        if (elemGroup.listen) // if user set event listeners via data-eca-listen attribute
        {
            try // to parse listen obj
            {
                const listenerStyles = JSON.parse(elemGroup.listen);
                
                const stylesToChange = eca.animatable.getEventStyles(listenerStyles, elemGroup); 
                
                for (let event in stylesToChange)
                {
                    if (stylesToChange.hasOwnProperty(event))
                    {
                        eca.helperFns.listenAll(elemGroup, event, function(e)
                        {
                            // use 'this' check below because the capture/bubbling phase could trigger
                            // the same event but on different element which we don't want
                            if (this === e.target) 
                            {
                                eca.animatable.setStyles(this, stylesToChange[event]);
                            }
                            
                        }, elemGroup.listenOnce);
                       
                    }
                }
            }
            catch (error)
            {
                console.error(error);
                console.error("Please make sure the data-eca-listen object on " + 
                    elemGroup.groupId + " is properly formatted JSON.");
            }
        }
        
    }; 
    
    // Note: only reason we need this function is to make the user's life easier, so they don't have to
    // type the full event name for the data-eca-listen attribute. They're much
    // less likely to make mistakes this way as well. For example, it's very easy to mess up
    // transitionstart by misspelling it or by using incorrect case (transitionStart). 
    // By having them use only start or end, we're less likely to encounter those problems.
    // @param {Object} listenerStyles - associates abbreviated event names with inline styles to set on each event
    // @param {ECA ElemGroup} elemGroup - array of elements to set listeners on
    // @returns {Object} stylesToChange - same object as listener styles but with unabbreviated event names
    eca.animatable.getEventStyles = (listenerStyles, elemGroup) =>
    {
        const stylesToChange = {};
        
        for (let eventAbbrv in listenerStyles)
        {
            let event = ""; 
            
            if (listenerStyles.hasOwnProperty(eventAbbrv) && eventAbbrv !== "run" && eventAbbrv !== "iteration")
            {
                event = elemGroup.animateWithTransitions ? "transition" + eventAbbrv : "animation" + eventAbbrv; 
                stylesToChange[event] = listenerStyles[eventAbbrv]; 
            }
            else if (listenerStyles.hasOwnProperty(event) && event === "run")
            {
                event = "transitionrun";
                stylesToChange[event] = listenerStyles[eventAbbrv];
            }
            else if (listenerStyles.hasOwnProperty(event))
            {
                event = "animationiteration"; 
                stylesToChange[event] = listenerStyles[eventAbbrv]; 
            }
        }
        
        return stylesToChange; 
        
    };
    
    // Checks if element is visible within the viewport. 
    // @param {HTML Element} elem 
    // @param {Number} triggerOffset - positive number to offset animation trigger point
    //     (i.e., amount that offsets on screen where element is considered in view).
    eca.animatable.elementInView = (elem, triggerOffset) =>
    {
        const windowHeight = eca.appState.windowHeight;
        const elemCoords = elem.getBoundingClientRect();
        
        elem.ecaElemProps.top = elemCoords.top;
        elem.ecaElemProps.bottom = elemCoords.bottom;
       
        triggerOffset = triggerOffset || eca.animatable.getMaxTriggerOffset(elem, windowHeight, triggerOffset);
        
        // elem is visible when top or bottom is in range 0 to windowHeight exclusive
        const elemInsideViewport = (elem.ecaElemProps.top + triggerOffset) < windowHeight && (elem.ecaElemProps.bottom - triggerOffset) > 0;
        const viewportInsideElem = (elem.ecaElemProps.bottom >= windowHeight && elem.ecaElemProps.top <= 0); // for when elem is larger than viewport
        
        elem.ecaElemProps.inView =  elemInsideViewport || viewportInsideElem; 
    };
    
    /*
        TriggerOffset is the amount in pixels we add or subtract to the top or bottom of an element before it's considered visible.
        Since the user can enter any number for offset (pixel value), the behavior of offset can be buggy dependent on
        window.innerHeight (which changes on resize) and element height (which can also change on resize), which
        setting a max offset prevents. 
        
        An elem is visible when any one pixel of it is in the range windowHeight to 0 exclusive, which 
        triggerOffset changes. So the question becomes, how many pixels can an element travel within the
        range windowHeight to 0 and still be visible (i.e., what's its visibility range)? 
        Well, the first pixel of its visibility is when it's top (getBoundingClientRect().top)
        is at windowHeight - 1 and last pixel of visibility is when its bottom is at 1. For a 500px height elem
        in a 1000px windowHeight screen, that's 1500px - 2px it can "travel" and still be considered visible. 
        
        So to get an element's visibility range (its travel range, t) we use the following formula: take the value
        of the first pixel of visibility minus the last pixel and add that to the element's height.
        
        Without offset that's simple, since the first visible pixel is always at windowHeight - 1 and the
        last at 1. With offset, the formula becomes (ignoring the -2px, which we'll add back at the end)
        
        t = ( (windowHeight - offset) - (0 + offset) ) + elem height. 
        
        or 
        
        t = windowHeight - 2*offset + elem height. 
        
        We want to know when t is 0, when the element will be visible but can not travel a single 
        pixel before it's not visible again. So we solve for when t=0 in the above formula
        which gives us: 
        
        0 = w -2offset + elemH. or  (w + elemH)/2 = maxOffset. or (w - 2 + elemHeight)/2 = maxOffset
        
        The elem's center will always be at the center of the screen at this point. (If we allowed negative
        values for t, the elem would never be visible, which is obviously a bug.) However, this makes
        for a pretty confusing user experience if we allow a max offset, since it's not realistic
        that a user will ever scroll in a way that allows for seeing the element at all. 
        
        Also, elements that are flush with the bottom of the document can never have more than 
        their height as the offset, since the document isn't scrollable past that amount. For this reason,
        ECA makes an elem's height the max offset for any element. 
        
        @param {HTML Element} elem 
        @param {Number} windowHeight - positive number, same as window.innerHeight
        @param {Number} triggerOffset - positive number to offset animation trigger point
        @returns {Number} maxTriggerOffset - positive number representing user entered trigger offset
            or, if that's too large, at most elem's height. 
    */
    eca.animatable.getMaxTriggerOffset = (elem, windowHeight = eca.appState.windowHeight, triggerOffset) =>
    {
        let elemHeight = 0;
        
        if (elem.ecaElemProps && elem.ecaElemProps.bottom && elem.ecaElemProps.top) 
        {
            elemHeight = elem.ecaElemProps.bottom - elem.ecaElemProps.top; 
        }
        else
        {
            elemHeight = elem.getBoundingClientRect().bottom - elem.getBoundingClientRect().top;
        }
        
        // minus 1 for edge case where element is 1px less
        // than viewport (e.g., 501 viewport Height and 500 elem height)
        const maxTriggerOffset = elemHeight - 1;
        
        return  triggerOffset > maxTriggerOffset ? maxTriggerOffset : Math.abs( triggerOffset ); 
    };

    // get duration of animation duration or delay.
    // @param {Number} duration - in seconds or milliseconds
    // @returns {Number} timeInMilliseconds - duration in
    //     milliseconds. 
    eca.animatable.getDurationInMS = duration =>
    {
        let timeInMilliseconds = 0;
        
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
    
    // Wrap text of some innerHTML in divs and spans.
    // Words are wrapped in divs, and letters in spans.
    // Any existing html tags inside innerHTML are rearranged
    // to respect newly inserted divs and spans (so html is still valid).
    // Text is wrapped so we can animate single letters or 
    // whole words.
    // @param {HTML Element} elem - elem with text of some sort.
    // Note: fn does not return anything but sets new innerHTML of original 
    // elem. 
    eca.animatable.wrapText = elem =>
    {
        // Separate html into word groups (in array) with 
        // accompanying html tags, if any.
        // Reminder: order of 'or's (|) in
        // regex matters. 
        const words = !!elem.innerHTML.match(/\S+<.+?>|<.+?>|\S+/g)
            ?
                elem.innerHTML.match(/\S+<.+?>|<.+?>|\S+/g)
            : 
                []; // for elems with empty innerHTML
        
        // wrap letters of each word in span,
        // and word itself in div.
        for (let i = 0; i < words.length; i++)
        {
            // rip out HTML tags from word,
            // if any
            const innerText = words[i].split(/<.+?>/g)[0] === words[i]
                ? 
                    // using positive lookahead,
                    // like split("") but respects surrogate pairs
                    words[i].split(/(?=[\s\S])/u)
                : 
                    words[i].split(/<.+?>/g); 
                    
            const htmlTags = words[i].match(/<.+?>/g);
            
            // need to build string outside element's .innerHTML because once you place a tag into some innerHTML,
            // a closing tag will automatically be inserted next to it, which isn't what we want. 
            let wrappedLetters = "";
            
            // Note: reason below code works is 
            // because match and split closely complement 
            // each other regarding tag placement in some string.
            // I.e., for each index of array returned by split (using html tag as split param)
            // match (using html tag as param) will give us the tag 
            // that split/delimited each index from the next. 
            for (let i = 0, j = 0; i < innerText.length; i++)
            {
                // if we don't get a match for replace below,
                // we still might get an htmlTag to be added to
                // newHTML str. 
                wrappedLetters += innerText[i].replace(/\S/g, 
                '<span class="letter" style="display: inline-block">$&</span>') + 
                    (htmlTags && typeof htmlTags[j] !== 'undefined' ? htmlTags[j++] : ''); 
            }
            
            // we need to grab html tags surrounding each
            // letter span and move them outside the word div. 
            // The regex we use here ensures we'll only ever have
            // two substrings returned from the split (the outer html tags).
            // (using ["|'] here so if I later rewrite the code below
            // I won't have to remember to use either single or double quotes.)
            const outerHTMLTags = wrappedLetters.split(/<span class=["|']letter["|'].+>\S<\/span>/g);
            
            // reminder: split will return wrappedLetters itself
            // if no match (hence no letters in 'word,' only
            // an html tag)
            if (outerHTMLTags[0] === wrappedLetters)
            {
                words[i] = wrappedLetters;
            }
            else // we have outer tags, so move to outside word div
            {
                
                // Reason we have to rip out outer tags and place outside word
                // can be illustrated with an example. Suppose we were
                // given the following input for this fn (e.g., this would be the innerHTML of an h1)
                // <span class="red">I am</span>.
                // After running this through our wrapText fn 
                // we'd get the following if we didn't
                // move the red span tag outside the word tags:
                // <div class="word"><span class="red">
                // <span class="letter">I</span></div> <div class="word"> ... </span> <--- this is the end of red
                // Basically, the span would start inside one div tag and
                // end inside another, which is not valid HTML.
                // Inserting that inside some innerHTML would see
                // a closing tag for the span automatically inserted
                // inside the div (the dom parser does this).
                
                // first rip out tags that need to be moved
                wrappedLetters = wrappedLetters.substring(
                    wrappedLetters.indexOf(outerHTMLTags[0]) + outerHTMLTags[0].length, wrappedLetters.length);
                    
                wrappedLetters = wrappedLetters.substring(0, wrappedLetters.lastIndexOf(outerHTMLTags[1]));
                
                // Using aria=hidden to hide word from screen readers. This is because some will try to read/enunciate 
                // each individual span wrapped letter. See further below where we set aria label for whole group.
             
                words[i] = 
                    outerHTMLTags[0] + 
                        '<div class="word" aria-hidden="true" style="position: relative; display: inline-block">' +
                            wrappedLetters +
                        '</div>' +
                    outerHTMLTags[1];
                
            }
    
        }
        
        // set aria-label to be the text of elem itself
        elem.setAttribute("aria-label", elem.innerText); 
        
        elem.innerHTML = words.join(" ");  
    
    }; 
    
    // This function is the first step to our animation pipeline.
    // Animating an element on scroll is as simple as defining the
    // animation for the element in css with an .eca-animated (past tense) class,
    // and then adding .eca-animate to the first of some group you want animated.
    // This function does the rest (selecting elements, configuring ECA props, sorting, etc). 
    eca.animatable.readyElementsForAnimation = () =>
    {
        // elements with same className will be part of same animation timeline/group.
        // (e.g., elements are always animated as part of a group, 
        // even if it's a single elem, since that single elem will
        // still be part of an array/group)
        const groupsOfAnimatableElems = { }; 
        
        // All eca-dataset properties live on the first elem
        // of each animatable group, which we need to grab the rest of. 
        // In general, this is a big distinction to keep in mind in the app: the
        // difference between an elem and an elemGroup (made of one or more elems),
        // and properties defined per elem and per group. 
        const firstElemsOfGroups = document.querySelectorAll(".eca-animate, .eca-animate-chars");
        
        // By convention groupId is the first class of classList (classList[0]),
        // and not from the elem's id attr. 
        // When animating chars, we tack on -letters to the end to distinguish
        // them from non text animating elems. 
        let groupId = ""; 
       
        for (let i = 0; i < firstElemsOfGroups.length; i++)
        {
            const isText = firstElemsOfGroups[i].classList.contains("eca-animate-chars"); 
            
            groupId = 
                // do we already have a group with this class name/groupId? 
                typeof groupsOfAnimatableElems[ firstElemsOfGroups[i].classList[0] + (isText ? "-letters" : "") ]  === "undefined"
                
                    ?
                        firstElemsOfGroups[i].classList[0] + (isText ? "-letters" : "")
                    :
                        // Same class name, but user added them again.
                        // This is useful, for example, if we have a class
                        // .card, and have multiple card groups
                        // we want animated across different sections.
                        // Since .card className has already been added
                        // we need to tack on a unique identifier (i) 
                        // here to distinguish it from the previous .card
                        // group(s). 
                        firstElemsOfGroups[i].classList[0] + (isText ? "-letters" : "") + i;
            
            isText && eca.animatable.wrapText( firstElemsOfGroups[i] );

            groupsOfAnimatableElems[ groupId ] = new eca.animatable.ElemGroup( firstElemsOfGroups[i], groupId );
            
            // since text is wrapped after page load (i.e., html altered), 
            // we need to add delays afterwards too (on each elem's dataset prop, normally
            // set from data-eca-delay attr in html)
            isText && eca.animatable.addUniqueDelays( firstElemsOfGroups[i] );
            
            eca.animatable.setListeners( groupsOfAnimatableElems[ groupId ] );
            
            eca.animatable.elementsToAnimate.push( 
                
                groupsOfAnimatableElems[ groupId ].playReversed 
                
                    ? 
                        groupsOfAnimatableElems[ groupId ].reverse() 
                    : 
                        groupsOfAnimatableElems[ groupId ] 
            );
        }
        
    }; 
    
    // fn helps to assist user in grabbing a specific element group 
    // from the eca.animatable.elementsToAnimate array.
    // not used in the app here but useful if user wants to provide their
    // own tracking function for some elem array in eca.animatable.elementsToAnimate 
    // @param {String} groupId - unique id of element group ECA tracks. Id is always
    //     first class of classList (note: must add -letters to class if animating letters).
    // @returns {ECA ElemGroup} elemGroup - array of elements ECA is currently tracking. 
    eca.animatable.getElementArray = groupId =>
    {
        let elemGroup = [];
        
        eca.animatable.elementsToAnimate.forEach(elemArr =>
        {
            if (elemArr["groupId"] === groupId)
            {
                elemGroup = elemArr; 
            }
        });
        
        return elemGroup; 
    };
    
    // Our main entry point into our "animation" functions (see scroll and resize handlers)
    eca.animatable.requestAnimationUpdate = () =>
    {
        // need to check if updating because scroll and resize listeners use this handler and both
        // can fire at the same time on resize events, giving us two updates in the same frame
        if ( !eca.appState.updating ) 
        {
            eca.appState.updating = true; 
            
            // below, we apply the read all then write all pattern to avoid layout thrashing
            // and unnecessary updates
            
            eca.animatable.updateAnimations(eca.animatable.setDynamicAnimationProps); // do batch reading of all elem coords  
            
            // do batch writing (change styles, add animation class, etc) at frame end
            // which avoids style conflicts with, for instance, any event listeners set that change styles
            requestAnimationFrame(() =>
                {
                     eca.animatable.updateAnimations(eca.animatable.animate);
                     eca.appState.updating = false; 
                }
            );
            
        }
       
    };
    
    // fn runs func on each group of elements in elementsToAnimate Array.
    // @param {Function} func
    eca.animatable.updateAnimations = func =>
    {
        for (let i = 0; i < eca.animatable.elementsToAnimate.length; i++)
        {
            const elemGroup = eca.animatable.elementsToAnimate[i];
            
            // only check if elems.finshedAnimating if removeAnimation is
            // false because removing animation gives elems chance to animate again.
            // Currently delayed elems have had all processing done on them already
            // and are already awaiting animation.
            if ( (elemGroup.removeAnimationWhenNotInView || !elemGroup.finishedAnimating) && !elemGroup.currentlyDelaying )
            {
                func(elemGroup);
            }
        }
                
    };
    
    // @param {HTML Element} elem - one element of a group of related elements that have an animation attached to them
    // @param {Number} animationDelay - this is a staggered delay, calculated by multiplying delayMuliplier by index i.
    //     (staggered delays are the default delay method used for animations in this app.)
    eca.animatable.setAnimationDelayProp = (elem, animationDelay) =>
    {
        // individual elems can also have a unique delay whether using staggered or constant delays (delays set via css)
        const delay = typeof elem.dataset.ecaDelay !== "undefined" 
            ? 
                eca.animatable.getDurationInMS(elem.dataset.ecaDelay) + "ms" 
            : 
                animationDelay + "ms";
        
        elem.ecaElemProps.delay = delay || 0 + "ms"; // store delay in variable so we don't cause a style recalc here
        
    };
    
    
    // calc dynamic elem properties like position (to see if elem in view)
    // and animation delay, which can change based on order of elems in a group
    // and whether previous elems have been animated already or not
    // @param {ECA ElemGroup} elems - group/array of html elems
    eca.animatable.setDynamicAnimationProps = elems =>
    {
        elems.visible = false; 
        
        // gets visibility of each elem and element group as a whole. 
        for ( let i = 0; i < elems.length; i++ )
        {
            if ( !elems.playOnLoad ) // because if we play animation on page load we don't care about element coordinates
            {
                eca.animatable.elementInView(elems[i], elems.offset); 
            }
            
            if ( !elems.visible && elems[i].ecaElemProps.inView || elems.playOnLoad )
            {
                // need to know if any part of elem group is visible (i.e., if any one elem is visible)
                // so we know whether to use groupDelay or not
                elems.visible = true; 
            }
         
        }
        
        const delayMultiplier = elems.delayMultiplier; 
        
        // Garbage values such as " " will not affect animation delay set via style attribute
        // since it's not a valid value, e.g., style="animation-delay=' ms'" does nothing, which we want if delayMult is 0
        // meaning user has set a constant delay via css or doesn't want one
        let animationDelay = delayMultiplier > 0 ? (elems.delayFromZero ? 0 : delayMultiplier) : " "; 
        
        for ( let i = (elems.delayFromZero ? 0 : 1), j = 0;
            j < elems.length; j++, animationDelay = delayMultiplier > 0 ? delayMultiplier * i : " ") 
        {
            if ( (elems[j].ecaElemProps.inView || elems.playOnLoad || ( elems.animateAllOnFirstSight && elems.visible ) ) 
                && !elems[j].ecaElemProps.animated ) 
            {
            
                // prop below encapsulates if logic of current block
                // used so we don't have to repeat in animate fn and
                // to be more explicit what's going on.
                elems[j].ecaElemProps.readyToAnimateAnimate = true; // because if elem if ready to have animation delay set, it's ready to animate
                eca.animatable.setAnimationDelayProp(elems[j], animationDelay);
                i++; 
                
            }
            else 
            {
                elems[j].ecaElemProps.readyToAnimateAnimate = false;
            }
           
        }  
    
    };
    
    // add class eca-animated with css animation defined elems of array,
    // (or remove class if element is below viewport out-of-sight), and 
    // potentially do some work on them with a custom function (if user defined one)
    // @param {ECA ElemGroup} elems - group/array of html elems
    eca.animatable.animate = elems =>
    {
        if ( elems.groupDelay > 0 && elems.visible )
        {
            elems.currentlyDelaying = true;
            elems.groupDelayOriginal = elems.groupDelay; 
            
            elems.delayId = setTimeout(function delayGroup()
            {
                eca.appState.groupDelayIds[elems.groupId] = null; 
                
                eca.animatable.setDynamicAnimationProps(elems); // get possible new positions for elems (user could've scrolled since delay start)
                
                // set groupDelay to 0 since groupDelay is only supposed to 
                // be applied once to all elems as a whole
                // and subsequent calls to animate, for unanimated elems in
                // elems array, shouldn't delay as group again
                elems.groupDelay = 0; 
                     
                requestAnimationFrame(function animateAfterDelay() 
                {
                    eca.animatable.animate(elems);
                    
                    elems.currentlyDelaying = false;
                });
               
            }, elems.groupDelay);   
            
            // below is useful if user uses trackingFn on elems and wants to 
            // cancel the group's delay
            eca.appState.groupDelayIds[elems.groupId] = elems.delayId; 
           
        }
        else // no group delay, animate right away
        {
            // track animated elems 
            // for purpose of running some cleanup or tracking function on 
            // them 
            const newlyAnimatedElems = []; 
            
            // for animateAllOnFirstSight option, considers group as a whole. 
            const groupAtRemoveAnimationPoint = elems.atRemoveAnimationPoint(); 
                    
            for (let i = 0; i < elems.length; i++)
            {
                // a variety of factors can make an element ready to animate or not (but mostly it's when an elem comes into view)
                // see setDynamicAnimationProps function to see complete logic for readyToAnimate
                if ( elems[i].ecaElemProps.readyToAnimateAnimate )   
                {
                    // if delay is undefined, style.animation/transitionDelay will stay unaltered
                    if (elems.animateWithTransitions)
                    {
                        elems[i].style.transitionDelay = elems[i].ecaElemProps.delay;
                    }
                    else
                    {
                        elems[i].style.animationDelay = elems[i].ecaElemProps.delay; 
                    }
                    
                    elems[i].classList.add('eca-animated');
                    newlyAnimatedElems.push(elems[i]);
                    elems[i].ecaElemProps.animated = true; 
                    elems[i].ecaElemProps.readyToAnimateAnimate = false; // because it's animated, hence not readyToAnimate anymore
                    elems.numAnimated++; 
                    
                }
                else if ( elems.removeAnimationWhenNotInView && !elems.animateAllOnFirstSight && !elems.playOnLoad &&
                     elems[i].ecaElemProps.animated && elems[i].ecaElemProps.atRemoveAnimationPoint ) 
                {
                    elems[i].classList.remove('eca-animated');
                    elems[i].ecaElemProps.animated = false;
                    elems[i].style = ""; 
                    elems.numAnimated--; 
                }
                else if ( elems.animateAllOnFirstSight && elems.removeAnimationWhenNotInView && elems.finishedAnimating && groupAtRemoveAnimationPoint )
                {
                    elems.forEach(elem => // remove animation for all elems in group when first elem goes out of view
                    {
                        elem.ecaElemProps.animated = false;
                        elem.style = "";
                        elem.classList.remove("eca-animated");
                        elems.numAnimated--;
                    });
                    break; 
                }
                
            }
            
            if (0 === elems.numAnimated) 
            {
                // reset groupDelay because we may have come out of group delay with canceled animation (and it's set to 0 there)
                // or user may have set removeAnimationWhenNotInView option which gives elems chance to animate again
                elems.groupDelay = elems.groupDelay || elems.groupDelayOriginal; 
                elems.finishedAnimating = false; // useful when removeAnimation option set
            }
            else if (elems.length === elems.numAnimated)
            {
                // so we don't run animate function on these elems again
                elems.finishedAnimating = true; 
                
            }
            
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
    
    eca.ready(function getThrottleLimits()
    {
        const html = document.querySelector("html"); 
                
        eca.appState.throttleLim.resize = eca.animatable.getDurationInMS(html.dataset.ecaThrottleResize || "0ms");
        eca.appState.throttleLim.scroll = eca.animatable.getDurationInMS(html.dataset.ecaThrottleScroll || "0ms");
    });
    
    eca.ready(function runInitialAnimations()
    {
        eca.animatable.readyElementsForAnimation(); 
        
        eca.animatable.requestAnimationUpdate();
    });
    
    eca.ready(function animateVisibleElemsOnScroll()
    {
        eca.helperFns.listen(window, "scroll", eca.appState.throttleLim.scroll 
            ? 
                eca.helperFns.throttle(eca.animatable.requestAnimationUpdate, eca.appState.throttleLim.scroll)
            : 
                eca.animatable.requestAnimationUpdate
        );
    });
    
    eca.ready(function animateVisibleElemsOnResize()
    {
        function ecaHandleResize()
        {
            eca.appState.windowHeight = window.innerHeight; 
            
            eca.animatable.requestAnimationUpdate(); 
        }
        
        eca.helperFns.listen(window, "resize", eca.appState.throttleLim.resize 
            ? 
                eca.helperFns.throttle(ecaHandleResize, eca.appState.throttleLim.resize)
            : 
                ecaHandleResize
        );
    }); 
   
    
   
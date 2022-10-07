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

const element1 = document.querySelectorAll('.element1').
element1.addSetupPropertiesToElements(prop1: 'property 1', prop2: etc...);
const element2 = document....
element2.addSetupPropertiesToElements(prop1: ...)
const element50 = document.... etc... 
And even more code to group them together into timelines if needed... 

With this library there's no more of that! 

The type of code described above is 
greatly simplified in this app. 
For example, in the
readyElementsForAnimation function, we
do all the above in just over ten lines.

Overall, all the code in the app is aimed
at doing one thing: deciding when to add
or remove a single class (the one with an animation) from
an elem. But to do that we need to know a little more
about the elem in question, such as where
it is in relation to the viewport. 

And to do this in an intelligent way,
one that doesn't cause performance 
problems, we differentiate between
reading and updating the DOM, two terms
you'll see used in both our scroll and Intersection
Observer implementations. 

By reading we mean to read some property 
that can force a style recalc and layout,
and update to either add or remove
the animated class from an elem.

Finally, I've commented the code below in sections
to make it easier to follow and read. 

For instance, if the reader wants to
see how animations are added on scroll,
or what happens on each scroll Event,
simply go to the Animation Functions (For Scroll)
section. 

To see the starting point of the app though, where 
the rest of the code is triggered from, start
at the listeners section at the very bottom. 

*/

// todo: file getting too long. Break
// file (main eca namespace in iife) into es6 modules

const eca = (function()
{
    /** 
     * Top level namespace,
     * provides a high level
     * overview of ECA and its
     * features.
     * 
     * @namespace eca 
     */
    const eca = { 
         /**
          * runs a callback when HTML is fully parsed
          * 
          * @memberof eca
          * @param {function} callback 
          * @returns {void}
          */
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
         /**
          * runs a callback when HTML is parsed
          * and resources are fully loaded
          * 
          * @memberof eca
          * @param {function} callback 
          * @returns {void}
          */
        readyAll: callback =>
        {
            if (document.readyState === 'complete')
            {
                callback();
            }
            else
            {
                window.addEventListener("load", callback); 
            }
        },
        /**
         * Namespace with all our
         * animation related functions 
         * and classes. 
         * 
         * @namespace eca.animatable
         * @memberof eca
         * @type {object} 
         * @property {eca.animatable.ElemGroup[]} elemGroups - array
         *     of ElemGroup instances (see constructor)
         */
        animatable: { elemGroups: [] }, 
        /**
         * Namespace with all the
         * miscellaneous functions
         * not directly related to 
         * animation. 
         * 
         * @namespace eca.helpers
         * @memberof eca
         * @type {object} 
         */
        helpers: {},
        /**
         * state props
         * ECA needs to operate. 
         * Certain state is only used
         * for our Intersection Observer (IO)
         * implementation--see props desc starting
         * with a *
         * 
         * @namespace eca.state
         * @memberof eca
         * @type {object} 
         * @property {number} windowHeight - current height
         *     of the window, minus scrollbars. Needed so 
         *     we can use this in scroll handlers without querying it 
         *     every time (only updated on resize events)
         * @property {number} prevWindowHeight - * This
         *     helps us capture new intersections
         *     while resizing the window, since our
         *     implementation ignores new intersections
         *     if scrollY is the same. Basically, if 
         *     prev and current windowHeight differ,
         *     then our implementation tells IO it
         *     can process new entries again.
         * @property {boolean} updating - signals to
         *     the app that elemGroups are being updated
         *     (delaying, adding, or removing animations
         *     to elems of group) and to allow no further
         *     updates in this frame. Needed because
         *     scroll and resize events can fire in same
         *     frame and update animations twice in said
         *     frame. 
         * @property {object} groupDelayIds - each key
         *     is the groupId of some ElemGroup instance.
         *     Values are setTimeout ids, needed so user 
         *     can cancel a group delay of some elemGroup.
         * @property {number} scrollY - * same as window.scrollY. 
         *     Current Y-coord of top edge of viewport. 
         *     Needed so we can stop IO from firing 
         *     infinitely while user isn't scrolling
         *     (we compare to prevScrollY). 
         * @property {number} prevScrollY *
         * @property {object} elemsUpdatedAtY - *
         *     Each scrollY is a key whose value is a 
         *     Map of Elem instances. We use this 
         *     so we know not to update elems at 
         *     same scrollY twice. NOTE: elems whose 
         *     groups do not use the animateAll option 
         *     are actually updated (i.e., animation added or removed)
         *     but for the animateAll option this is not necessarily 
         *     the case. For those elems, they may or may not be
         *     updated, but when added here we know they were 
         *     run through our updateEntries fn. Also, for the
         *     animateAll option, not all elems updated at some
         *     scrollY will be added here (since only one needs
         *     to be visible for the whole group to animate).
         * @property {eca.animatable.Elem[]} unobservedElems - *
         *     elems at some scrollY seen there twice. We 
         *     unobserve them so IO's cb doesn't potentially 
         *     fire for them again and reobserve upon
         *     each new scroll event in order to keep their
         *     coords the most up-to-date.
         */
        state: { 
            windowHeight: document.documentElement.clientHeight, 
            prevWindowHeight: document.documentElement.clientHeight, 
            updating: false, 
            groupDelayIds: {}, 
            scrollY: 0, 
            prevScrollY: null,
            elemsUpdatedAtY: {}, 
            unobservedElems: [] 
        },
        /**
         * data-eca settings 
         * of the HTML element
         * 
         * @namespace eca.globals
         * @memberof eca
         * @type {object} 
         */
        globals: { 
            
        }

    };
    
    
    /* HELPER FUNCTIONS
    ==============================================================
    ==============================================================
    */
    
    
    /**
     * generalized event listener for a single EventTarget obj; 
     * wraps addEventListener
     * 
     * @param {(EventTarget|string)} target - EventTarget obj to add event listener to
     *     or querySelector string that returns EventTarget obj
     * @param {string} event - event name to listen for
     * @param {function} cb - callback to run when event fires
     * @param {object} options
     * @returns {void}
     */
    eca.helpers.listen = (target, event, cb, options) =>
    {
        target = typeof target === 'string' ? document.querySelector(target) : target;
        target.addEventListener(event, cb, options);
    };
    
    
    /**
     * generic event listener for array of EventTarget objs
     *
     * @param {(EventTarget[]|string)} targets - List of EventTarget objs 
     *     or querySelectorAll string that returns list of EventTarget objs
     * @param {string} event - event name to listen for
     * @param {function} cb - callback to run when event fires
     * @param {object} options 
     * @returns {void}
     */
    eca.helpers.listenAll = (targets, event, cb, options) =>
    {
        targets = typeof targets === 'string' ? document.querySelectorAll(targets) : targets;
        targets.forEach(target => eca.helpers.listen(target, event, cb, options));
    };

    /**
     * converts string representation of a number 
     * to a ms number value. 
     *
     * @param {string} value - representing number in seconds or milliseconds
     * @returns {number} msValue - value converted to milliseconds 
     */
    eca.helpers.convertToMS = value =>
    {
        if (!value) 
        {
            return value; 
        }

        let msValue = 0;
        
        if (value.indexOf('ms') !== -1) 
        {
            msValue = parseFloat(value);
        }
        else if (value.indexOf('s') !== -1) // seconds
        {
            msValue = parseFloat(value) * 1000; 
        }
        else // unitless or wrong unit with number so just assume it's in ms
        {
            msValue = parseFloat(value);
        }
        
        return msValue;
    };
    
    /**
     * standard throttle.
     * The last event to come in while function is in throttle
     * is processed after throttle limit expires.
     *
     * @param {function} fn - fn to run after throttle limit expires
     * @param {number} limit - how long to wait before running fn again (ms value)
     * @returns {function} throttledHandler - closure that calls 
     *     fn passed to throttle when limit expires
     */
    eca.helpers.throttle = (fn, limit) =>
    {
        let inThrottle = null;
        let event = null; 
        
        /**
         * closure that implements throttle functionality. If an event
         * was fired while in a previous throttle, that event
         * is processed by the handler after the previous throttle
         * limit expires.
         *
         * @param {Event} e - event to be passed to throttleHandler and
         *     applied to fn. Set equal to outer scope's event variable 
         *     so we can track new events coming in while previous throttler 
         *     is still running.
         * @returns {void}
         */
        const throttledHandler = function(e)
        {
            const args = arguments;
            const context = this;
            
            event = e; 
            
            if (!inThrottle) 
            {
                fn.apply(context, args); 
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

    /**
     * saves data-eca attrs on the HTML elem
     * as global variables so we can access them
     * when creating our groups.
     * 
     * @returns {void}
     */
    eca.helpers.saveGlobalOptions = () =>
    {
        const {getOption} = eca.helpers; 
        const html = document.querySelector("html"); 
        const keysToRename = "ecaThrottleResize ecaThrottleScroll ecaUseScroll"; 

        for (const k in html.dataset)
        {
            if (html.dataset.hasOwnProperty(k) && k.includes("eca"))
            {
                if ( ! keysToRename.includes(k) )
                {
                    eca.globals[k] = html.dataset[k]; 
                }
            }
        }
       
        eca.globals.throttleLimResize = getOption(html, "ecaThrottleResize", {convertToMS: true, isNum: true});    
        eca.globals.throttleLimScroll = getOption(html, "ecaThrottleScroll", {convertToMS: true, isNum: true});  
        eca.globals.useScroll = getOption(html, "ecaUseScroll");

        // we give user the option to use our scroll implementation instead of 
        // Intersection Observer, but if Intersection Observer isn't defined, we
        // have to use scroll. 
        eca.globals.useScroll = window.IntersectionObserver 
            ? 
                eca.globals.useScroll 
            : 
                true; 
    };

    /**
     * returns transformed data-eca-* option on specified HTML elem
     * or same option saved from HTML elem stored in eca.globals.
     *
     * @param {Element} [htmlElem]
     * @param {string} name - name of dataset prop to grab
     * @param {object} [props={}] - properties specifying how to
     *     transform dataset property (e.g., should it be interpreted
     *     as string or number?)
     * @returns {(string|number|boolean)} value - value of transformed dataset prop
     */
    eca.helpers.getOption = (htmlElem, name, props = {}) =>
    {
        // props that tell us how to interpret/convert dataset ECA prop.
        // Reminder: need hasGlobal var else user could put anything as global 
        // prop and it has chance to be read.  
        const {isStr, isNum, convertToMS, hasGlobal = false} = props; 

        // using optional chaining on elem 
        // because we could just be grabbing a global
        let value = (typeof htmlElem?.dataset[name] !== "undefined" 
            ? 
                htmlElem.dataset[name].trim().toLowerCase()
            : 
                hasGlobal && (typeof eca.globals[name] !== "undefined"
                    ?
                        eca.globals[name].trim().toLowerCase()
                    :
                        false
                )
        );   
        
        if (isStr)
        {
            // We want this value to be interpreted 
            // as a string, with two exceptions:
            // when it's either "true" (or just present, empty str)
            // or "false." This is because this option only applies
            // when an option can have three or more values,
            // in which case we simply want to treat true as some
            // default value. For example, with the replays option we
            // interpret true as "both" and only when we specify 
            // "above" or "below" do we need to care about the str value.
            // This makes it easy for the user to switch the option on
            // and possible to switch it off again when trying to overwrite
            // a global option per group (just specify false to turn off). 
            value = value === "" || value === "true" 
                ? 
                    true 
                : 
                    (value === "false" ? false : value); 
        }
        else if (isNum)
        {
            value = convertToMS ? eca.helpers.convertToMS(value) : value; 

            value = parseInt(value, 10); 

            // check for NaN 
            value = value === value ? value : 0;   
        }
        else // bool
        {
            value = value === "false" || value === false ? false : true;
        }

        return value;         
    };
    
    /* ANIMATION FUNCTIONS
    ==============================================================
    ==============================================================
    */

    /**
     * ECA's blueprint for an 
     * elem with regards to facilitating
     * adding and removing 
     * CCS3 animations/translations
     * from it. 
     *
     */
    eca.animatable.Elem = class
    {        
        // The below is strictly for when
        // using the Intersection Observer (IO)
        // implementation. 
        // This is needed so later when IO 
        // gives us entries we can know which Elem 
        // its target belongs to. Using weak-map
        // so in later implementations when 
        // elems are deleted the corresponding entries
        // here will be automatically GC and deleted 
        // as well. 
        // Using privates here so we can control 
        // how they're accessed and modified. 
        static #elemMap = new WeakMap(); 
        #isVisible; 
        #isAnimated; 

        /**
         * construct Elem in terms of what ECA needs to
         * operate
         * 
         * @param {Element} target - underlying Element from  
         *     HTML/document
         * @param {eca.animatable.ElemGroup} elemGroup - instance of ElemGroup
         *     we want elem associated with
         * @param {number} groupThreshold - user set threshold that applies to 
         *     every elem of group. 
         */
        constructor(target, elemGroup, groupThreshold)
        {
            // both top and bottom 
            // will always be coords relative
            // to the window (0 being window's top most
            // point and bottom coord of window being
            // its height). Top and bottom coords 
            // are always taken from a target's
            // BoundingClientRect
            this.top = null;
            this.bottom = null;

            // if any one pixel of elem is visible,
            // but also takes into account the threshold
            // setting below            
            this.#isVisible = false; 
            this.#isAnimated = false;

            // this is based on elem's height. 
            // It's a percent amount elem must cross (except for when 1
            // then threshold must be exactly met)
            // to be considered visible (e.g., for 25% greater than 
            // that amount of elem must cross viewport for it to 
            // be considered visible, 25.1, 25.6, 26%, etc..).
            // As of now, the app only allows 5 thresholds:
            // 0, 0.25, 0.5, 0.75, 1
            this.threshold = eca.animatable.convertThreshold( 
                // threshold is a num but we want the 
                // str value that user entered for 
                // the convertThreshold fn
                eca.helpers.getOption(target, "ecaThreshold", {isStr: true}) || groupThreshold
            ); 

            // need to save threshold because it might need to be changed
            // based on the size of the elem (see correctThreshold fn). 
            this.originalThreshold = this.threshold; 

            // user sets this if they want to have a delay separate from
            // the stagger. 
            this.uniqueDelay = eca.helpers.convertToMS(target.dataset.ecaDelay);
            
            // circular reference back to group since we 
            // want each elem of group to be able to modify group
            // and read its props
            this.group = elemGroup; 

            this.target = target; 
            this.constructor.#elemMap.set(target, this); 

            // so we respect any user set inline styles:
            // saved because we reset inline styles each 
            // time we remove animation, since, for 
            // instance, stagger delays are likely 
            // to be different each time elem is
            // animated, which is set via inline styles.
            this.originalInlineStyles = target.style.cssText; 
        }

    /*
        It may seem counterintuitive to have an accessor prop that 
        lets us know when an elem is ready to have its animation removed, instead of just
        using !isVisible or !isReadyToAnimate. However, the app decouples an elem's 
        "when-to-add-animation" logic from its "when-to-remove-animation" logic
        through the various options offered to users (for one,
        an elem doesn't even have to be visible for it to be considered ready to animate; 
        likewise for the inverse). 
        Note: below, we're making a distinction between CSS3 animations versus
        transitions. 
        
        For instance, we want to consider threshold (for elements using animations)
        when deciding when they come into view, but not when they go out of view. 
        This is because animations simply revert/snap back to their original state
        instead of reverting smoothly like transitions do. Hence we have to have separate
        logic for when elems using CSS3 animations leave the viewport. 
        
        Also, users can choose when the animation will be removed from an element
        by specifying one of three options for removeAnimationWhenNotInView (e.g., do
        we want to remove the animation when the element is either above or below the viewport,
        just below, or just above?). 

        Basically, there's a bit more that goes into deciding when to remove an animation than 
        just its visibility. 
    */  
        get isReadyToDeanimate()
        {                
            if ( !this.group.removesAnimationWhenNotInView 
                || this.group.playsOnLoad
                || !this.#isAnimated )
            {
                return false; 
            }

            // true considers invisibility as elem being either completely above or below viewport
            if (this.group.removesAnimationWhenNotInView === true)
            {
                return this.group.animatesAllOnFirstSight 
                    ?
                        !this.group.isVisible
                    : 
                        !this.isVisible;
            }
            else if (this.group.removesAnimationWhenNotInView === "below") // when elem below viewport
            {
                return this.group.animatesAllOnFirstSight
                    ?
                        !this.group.isVisible && this.group.upToDateELem.bottom > eca.state.windowHeight
                    :            
                        !this.#isVisible && this.bottom > eca.state.windowHeight;
            }
            else if (this.group.removesAnimationWhenNotInView === "above")
            {
                return this.group.animatesAllOnFirstSight
                    ?
                        !this.group.isVisible && this.group.upToDateELem.top < 0
                    :              
                        !this.#isVisible && this.top < 0; 
            }
        }

        get isReadyToAnimate() 
        {
            if (this.#isAnimated || this.group.isDelaying)
            {
                return false; 
            }
            else
            {
                return this.#isVisible || this.group.playsOnLoad || (this.group.animatesAllOnFirstSight && this.group.isVisible);
            }
        }

        // each elem has one of three types of delay:
        // 1. staggered delay - an elem participating in a staggered
        //     delay will have its delay set to a multiple of its group's 
        //     delayMultiplier instance field. 
        // 2. uniqueDelay - separate from stagger. This way, user can
        //     still set a stagger for group but decide some elem should
        //     delay differently and not participate in the stagger. 
        // 3. null - which is the same as 0, unless the user specified,
        //     via CSS, a CSS animation or transition delay, in which case
        //     elem will use that (not set via JS then)
        // This accessor decides which of the previous three the elem should receive. 
        get delay() 
        {
            if ( this.uniqueDelay || this.uniqueDelay === 0 )
            {
                return this.uniqueDelay; 
            }
            else if ( this.group.nextStaggeredDelay )
            {
                return this.group.nextStaggeredDelay; 
            }
            else if ( this.group.nextStaggeredDelay === null && this.group.delayMultiplier)
            {
                return this.group.staggersFromZero ? 0 : this.group.delayMultiplier; 
            }
            else // no delay/use delay set on animation/transition in CSS def
            {
                return null; 
            }                
        }

        get isVisible()
        {
            return this.#isVisible;
        }

        set isVisible(isVisible)
        {
            const prevIsVisible = this.#isVisible; 

            // using double not just 
            // to ensure it's always boolean
            this.#isVisible = !!isVisible; 

            if (isVisible !== prevIsVisible) 
            {
                this.group.updateVisibility(isVisible); 
            }
        }

        get isAnimated()
        {
            return this.#isAnimated; 
        }

        set isAnimated(isAnimated)
        {
            const prevIsAnimated = this.#isAnimated;

            this.#isAnimated = !!isAnimated;

            if (isAnimated !== prevIsAnimated)
            {
                this.group.updateAnimationStatus(isAnimated); 
            }
        }

        static getElem(target)
        {
            return this.#elemMap.get(target); 
        }
    };

    /**
     * blueprint for elems that share common
     * features (e.g., elems user wants animated
     * but with their delays staggered or are 
     * conceptually the same, as in a group of card divs).
     * 
     * ECA's main functionality revolves around
     * working with ElemGroup instances, not 
     * individual Elem instances. In other words,
     * ElemGroup instances are the conceptual
     * building blocks of ECA. 
     */
    eca.animatable.ElemGroup = class 
    {
        /**
         * sets custom properties that ECA
         * needs to operate. 
         * 
         * Each elemGroup.elems element at each index i 
         * for some new ElemGroup() is an Elem (see class def)
         * instance. 
         * 
         * @param {Element} htmlElem - first elem of a group we want to animate
         *     (or parent element of text group we want to animate)
         *     with useful dataset props for entire group.
         * @param {string} groupId - so ECA can uniquely identify group
         */
        constructor(htmlElem, groupId)
        {
            const {getOption} = eca.helpers; 
            
            const elemGroup = typeof htmlElem.dataset["ecaAnimateChars"] !== "undefined"
                ? 
                    htmlElem.getElementsByClassName("letter")
                : 
                    htmlElem.parentElement.getElementsByClassName( htmlElem.classList[0] ); 
            
            this.elems = []; 

            const groupThreshold = getOption(htmlElem, "ecaThresholdAll", {isStr: true, hasGlobal: true});

            for (let i = 0; i < elemGroup.length; i++)
            {
                this.elems[i] = new eca.animatable.Elem(elemGroup[i], this, groupThreshold);
            }

            this.groupId = groupId; 

            // Many options can be set as a global property (applies to every group)
            // while leaving the option of overriding the global setting per ElemGroup

            // for calculating a staggered delay
            this.delayMultiplier = 
                getOption(
                    htmlElem, 
                    "ecaStagger", 
                    {isNum: true, convertToMS: true, hasGlobal: true}
                ); 
            
            // setting this option will include zero as first multiple of delayMultiplier
            this.staggersFromZero = getOption(htmlElem, "ecaStaggerFromZero", {hasGlobal: true});

            // if we're using a staggered delay, the only way to get an element's delay 
            // is to know how many elements of the group are visible, which visible ones haven't
            // yet been animated, and the position of this element relative to the rest. 
            // We can do this by looping through the entire element group each time, or just
            // use a bit of extra memory and store the next delay on the group itself. 
            this.nextStaggeredDelay = null;
            
            // duration of animation, not used in app but useful 
            // if user wants to get the duration of the animation
            // for custom animation function without risking a style
            // recalc. 
            this.duration = getOption(htmlElem, "ecaDuration", {isNum: true, convertToMS: true}) || null; 
            
            // delay before any one htmlElem of group animates (distinct from a css animation-delay). 
            this.groupDelay = getOption(htmlElem, "ecaGroupDelay", {isNum: true, convertToMS: true});
            
            // Save group delay so if removesAnimationWhenNotInView
            // prop is set we can still have original delay,
            // which is set to 0 once initial animation is completed. 
            // (Could keep groupDelay always set, but then elems in 
            // a group that haven't animated yet will trigger
            // another group delay.)
            this.originalGroupDelay = this.groupDelay;  
            
            // so we know not to run elements delaying through
            // animation functions again. 
            this.isDelaying = false;
            
            // setTimeout id of a groupDelayed group.
            // never used in the app but if the user
            // wants to write some custom code, they may
            // need this value. 
            this.delayId = null; 

            // when ECA has finished "animating" the group: i.e.,
            // when the eca-animated class has been added to all elems
            // of this group (doesn't necessarily mean 
            // the animation has finished playing for it,
            // or that it even started, for that matter).
            this.isFinishedAnimating = false; 
            
            // elems that have had the eca-animated class added to them
            this.numElemsAnimated = 0; 
            
            // Play animation right away when page loads instead of on scroll.
            // This is how css animations normally work. Basically, this tells ECA
            // not to bother with scroll behavior, though we could still use ECA
            // for delays. 
            this.playsOnLoad = getOption(htmlElem, "ecaPlayOnLoad", {hasGlobal: true});
                    
            // starts the stagger delay at last elem of group instead of first
            this.playsReversed = getOption(htmlElem, "ecaReverse");
            
            // If one element is in view, we animate all of the group regardless if user can see rest.
            // Can be useful, for example, for title text of a section that wraps lines.
            this.animatesAllOnFirstSight = getOption(htmlElem, "ecaAnimateAllOnFirstSight", {hasGlobal: true});
            
            // because playOnLoad and animateAll options are mutually exclusive 
            this.animatesAllOnFirstSight = this.playsOnLoad ? false : this.animatesAllOnFirstSight; 
            
            // only needed for IntersectionObserver (IO). For scroll this could be any elem of group.
            // This is used for the animatesAllOnFirstSight option combined with the removesAnimation... 
            // option set to either 'below' or 'above.' When deciding if group isReadyToDeanimate, we 
            // need to know if group is entirely obscured above or below viewport. Normally, when using
            // scroll, each new scroll pos updates coords of entire group. Using IO, only certain elems
            // are ever updated on scroll, ones with changing intersection ratios (IR). We can be below
            // an elemGroup and only see the bottom row of elements, which causes the group to animate,
            // but what happens if the user scrolls in such a way that it skips the rest of the rows
            // but all of the group ends up out of view below the viewport? Well, only that bottom
            // row will have had its coords updated (since it went from intersecting to not). The 
            // rest were never updated. Hence, we take whatever elem has been previously updated,
            // one from that bottom row, and use those to see if the group itself is entirely out of
            // view below the viewport. 
            this.upToDateELem = this.elems[0];  
            
            // event listeners with associated styles to change on animation start, end, iteration, cancel. 
            this.listen = htmlElem.dataset.ecaListen; 
            
            // fire event listener once then remove it. 
            this.listensOnce = eca.helpers.getOption(htmlElem, "ecaListenOnce");

            // need to know this so we know what type of delay to set, animation vs transition delay
            this.animatesWithTransitions = getOption(htmlElem, "ecaAnimateWithTransitions", {hasGlobal: true});
            
            // global option, removes animation when element is not visible so element can animate again when visible.
            // Can take one of four values: false, true, above or below. When true, the animation is reset when elem
            // is out of view above or below the viewport. When below is set, the animation is only reset when the elem
            // is below the viewport, not above--vice versa for when above is set. 
            this.removesAnimationWhenNotInView = 
                getOption(null, "ecaRemoveAnimationWhenNotInView", {isStr: true, hasGlobal: true});
            
            // if any one elem is visible, then so is group.
            // helps with animatesAll option and with groupDelay
            this.isVisible = this.playsOnLoad ? true : false; 

            this.numElemsVisible = 0; 
        }

        // need to know group visibility for group delay option and animatesAllOnFirstSight
        // option. 
        updateVisibility(elemIsVisible)
        {
            this.numElemsVisible += elemIsVisible ? 1 : -1; 
    
            this.isVisible = this.numElemsVisible > 0 ? true : false; 
        };
    
        updateAnimationStatus(elemIsAnimated)
        {
            this.numElemsAnimated += elemIsAnimated ? 1 : -1; 
    
            this.isFinishedAnimating = this.numElemsAnimated === this.elems.length ? true : false; 
        };
    
        // need to store next delay because we have no idea ahead of time which
        // elem in group will receive said delay (i.e., delays are decided 
        // on each scroll event or each firing of intersection observer cb).
        // It is the responsibility of each elem that uses the .nextStaggeredDelay
        // to call this to store the next one. 
        updateNextStaggeredDelay()
        {
            if ( this.nextStaggeredDelay )
            {
                this.nextStaggeredDelay += this.delayMultiplier; 
            }
            else if ( this.nextStaggeredDelay === null && this.delayMultiplier) // always for first delay of group or first newly delayed elem
            {
                this.nextStaggeredDelay = this.staggersFromZero ? this.delayMultiplier : 2 * this.delayMultiplier;  
            }
        };
    }

    /* ANIMATION FUNCTIONS (FOR INITIALIZING THE APP)
    ==============================================================
    ==============================================================
    */

    /**
     * This fn creates our ElemGroup instances (what ECA operates on):
     * it selects, sorts, configures props, etc... and stores 
     * references to each group. 
     * 
     * @returns {void}
     */
    eca.animatable.readyElementsForAnimation = () =>
    {
        const {
            ElemGroup, 
            updateCharUniqueDelays, 
            addListeners,
            wrapText,
            elemGroups
        } = eca.animatable; 

        // Elements with same className will be part of same animation timeline/group.
        // (e.g., elements are always animated as part of a group, 
        // even if it's a single elem, since that single elem will
        // still be part of an ElemGroup instance)
        const groupsOfAnimatableElems = { }; 
        
        // All eca-dataset properties live on the first elem
        // of each animatable group, which we need to grab the rest of. 
        // In general, this is a big distinction to keep in mind in the app: the
        // difference between an elem and an elemGroup (made of one or more elems),
        // and properties defined per elem and per group. 
        const firstElemsOfGroups = document.querySelectorAll("[data-eca-animate], [data-eca-animate-chars]");        
    
        // By convention groupId is the first class of classList (classList[0]),
        // and not from the elem's id attr. 
        // When animating chars, we tack on -letters to the end to distinguish
        // them from non text animating elems. 
        let groupId = ""; 
    
        // using regular for loops and not forEach here (same in wrap text fn)
        // for speed. With a large number of elems, forEach loops 
        // could be almost twice as slow here, and we want to init the 
        // app as fast as possible. 
        for (let i = 0; i < firstElemsOfGroups.length; i++)
        {
            const isText = typeof firstElemsOfGroups[i].dataset["ecaAnimateChars"] !== "undefined"; 
            
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
            
            isText && wrapText( firstElemsOfGroups[i] );

            groupsOfAnimatableElems[groupId] = new ElemGroup( firstElemsOfGroups[i], groupId );
            
            // since text is wrapped after page load (i.e., html altered), 
            // we need to add delays afterwards too (normally
            // set from data-eca-delay attr in html)
            isText && updateCharUniqueDelays( firstElemsOfGroups[i], groupsOfAnimatableElems[groupId] ); 
            
            addListeners( groupsOfAnimatableElems[groupId] );

            groupsOfAnimatableElems[groupId].playsReversed 
                && groupsOfAnimatableElems[groupId].elems.reverse(); 
            
            elemGroups.push( groupsOfAnimatableElems[groupId] ); 
        }
    };

    /**
     * This fn saves some text elem's unique delay to its 
     * uniqueDelay field. New HTML for text is added dynamically
     * on page load (each letter wrapped in span with class .letter), 
     * so we need to get the unique delays, which would normally be on the 
     * dataset.ecaDelay attr in the HTML, from the ecaCharDelays
     * attr on the parentElement that contains the text.
     * (note: this fn doesn't actually set a delay, just
     * saves the delay so it can later be set, which we do 
     * so we don't potentially cause a style recalc at an inappropriate time.)  
     *
     * @param {Element} textContainer - containing parent of all letters of elemGroup,
     *       where user specified delays to be set for letters of elemGroup
     * @param {eca.animatable.ElemGroup} elemGroup - instance of ElemGroup 
     * @param {eca.animatable.Elem[]} elemGroup.elems - array of Elem instances (our spans/letters)
     * @returns {void} 
     */
    eca.animatable.updateCharUniqueDelays = (textContainer, {elems}) =>
    {
        if ( !textContainer.dataset.ecaCharDelays )
        {
            return; 
        }
    
        try // to parse JSON object
        {
            const delaysObj = JSON.parse(textContainer.dataset.ecaCharDelays);
            
            for (let k in delaysObj)
            {
                if ( delaysObj.hasOwnProperty(k) && (k-1 <= elems.length) )
                {
                    // k-1 because we take the perspective of a user
                    // reading some text in the html, where it's more
                    // natural to talk about the first char of a title/para/etc, 
                    // rather than char zero. 
                    elems[k-1].uniqueDelay = eca.helpers.convertToMS(delaysObj[k]); 
                }
            }
        }
        catch (error)
        {
            console.error(error);
            console.error("Please make sure the data-eca-char-delays object on " +
                textContainer.classList[0] + " is properly formatted JSON.");
        }
    };

    /**
     * set event listener on animatable targets
     * with handler that sets styles at some point in animation/transition.
     *
     * @param {eca.animatable.ElemGroup} elemGroup - instance of ElemGroup 
     * @returns {void} 
     */
    eca.animatable.addListeners = elemGroup =>
    {
        if ( !elemGroup.listen )
        {
            return; 
        }
        
        try // to parse listen obj
        {
            const listenerStyles = JSON.parse(elemGroup.listen);
            
            const stylesToChange = eca.animatable.getEventStyles(listenerStyles, elemGroup); 

            const eventTargets = elemGroup.elems.map(elem => elem.target); 
            
            for (let event in stylesToChange)
            {
                if (stylesToChange.hasOwnProperty(event))
                {
                    eca.helpers.listenAll(eventTargets, event, e =>
                    {
                        // use check below because the capture/bubbling phase could trigger
                        // the same event but on different element which we don't want
                        if (e.currentTarget === e.target) 
                        {
                            eca.animatable.setStyles(e.currentTarget, stylesToChange[event]);
                        }
                        
                    }, elemGroup.listensOnce ? {once: true} : false);
                    
                }
            }
        }
        catch (error)
        {
            console.error(error);
            console.error("Please make sure the data-eca-listen object on " + 
                elemGroup.groupId + " is properly formatted JSON.");
        }
    }; 
    
    /**
     * Creates an object with keys as event names and values as styles to change for those events.
     * Note: only reason we need this function is to make the user's life easier, so they don't have to
     * type the full event name for the data-eca-listen attribute. They're much
     * less likely to make mistakes this way as well. For example, it's very easy to mess up
     * 'transitionstart' by misspelling it or by using the incorrect case (transitionStart). 
     * By having them use only 'start' or 'end,' we're less likely to encounter those problems.
     *
     * @param {object} listenerStyles -  associates abbreviated event 
     *     names with inline styles to set on each event
     * @param {eca.animatable.ElemGroup} elemGroup - instance of ElemGroup
     * @returns {object} stylesToChange - same object as 
     *     listener styles but with unabbreviated event names
     */
    eca.animatable.getEventStyles = (listenerStyles, elemGroup) =>
    {
        const stylesToChange = {};
        
        for (let eventAbbrv in listenerStyles)
        {
            let event = ""; 
            
            if (listenerStyles.hasOwnProperty(eventAbbrv) && eventAbbrv !== "run" && eventAbbrv !== "iteration")
            {
                event = elemGroup.animatesWithTransitions ? "transition" + eventAbbrv : "animation" + eventAbbrv; 
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

    /**
     * set styles on elem at some point in animation
     * e.g., start, end, iteration
     *
     * @param {Element} htmlElem - elem to apply new styles to
     * @param {string} newStyles - represents inline styles to set on htmlElem.
     * @returns {void}
     */
    eca.animatable.setStyles = (htmlElem, newStyles) =>
    {
        const currentStyles = htmlElem.style.cssText; 
        
        // Reminder:
        // can't set styles here via rAF like we do inside requestAnimationUpdate fn
        // because if event handler code ran at the same place in the frame's life cycle
        // we could run into a situation where we're trying to remove the animation from 
        // the element but then right after the handler code runs and sets some new style 
        // that makes it appear the element is stuck in its final animationend state. 
        htmlElem.style.cssText = currentStyles + " ; " + newStyles; 
    };

    /**
     * Wrap text of some Element obj's innerHTML in divs and spans.
     * Words are wrapped in divs, and letters in spans.
     * Any existing HTML tags inside innerHTML are rearranged
     * to respect newly inserted divs and spans (so HTML is still valid).
     * (Text is wrapped so we can animate single letters or 
     * whole words.)
     *
     * @param {Element} htmlElem - elem containing a text node
     * @returns {void} 
     */
    eca.animatable.wrapText = htmlElem =>
    {
        // Reminder: order of 'or's (|) in
        // regex matters. 
        const words = htmlElem.innerHTML.match(/\S+<.+?>|<.+?>|\S+/g);

        if (words === null)
        {
            return;
        }
        
        for (let i = 0; i < words.length; i++)
        {
            let innerText = words[i].split(/<.+?>/g);
                    
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
            // (using ["|'] here so if we later rewrite the code below
            // we won't have to remember to use either single or double quotes.)
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
                // inside the div (the browser's parser does this).

                
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
                
        // doing words.map... below because elem.innerText will force a style recalc + layout, 
        // and since we wrap all text elems at once when we init ECA, doing that repeatedly will 
        // cause multiple forced synchronous layouts. 
        htmlElem.setAttribute("aria-label", words.map(word => word.split(/<.+?>/g).join("")).join(" ")); 

        htmlElem.innerHTML = words.join(" ");  
    };
    
    /**
     * Reads coords of elem to see if it's visible
     * within the viewport and sets .isVisible field
     * of elem accordingly.
     * Note: fn doesn't actually change visibility
     * on screen, only updates an instance field.
     *
     * @param {eca.animatable.Elem} elem - instance of Elem
     * @returns {void}
     */
    eca.animatable.calculateVisibility = elem =>
    {

        /*
            Diagram of viewport, its height
            being counted by starting at 0 coord
            at the top. Top and bottom coords of
            elem.target's boundingClientRect are
            relative to the viewport.

            0
            =====================
            |                   |
            |                   |
            |                   |
            |                   |
            |                   |
            =====================
            windowHeight (e.g., = 500)
        */
        

        const windowHeight = eca.state.windowHeight;
        const {top, bottom, height} = elem.target.getBoundingClientRect();
        
        elem.top = top;
        elem.bottom = bottom;

        // Minus 1 for when threshold is 1 because threshold
        // is normally a percentage that must be passed for elem to
        // be considered visible--except for when threshold is
        // 1 because at max 100% of an elem can be in the viewport.
        let pixelThreshold = (height * elem.threshold) - (elem.threshold === 1 ? 1 : 0); 
       
        // conditional below makes sure we only use offset, when removing an animation, for 
        // groups using CCS3 transitions, not CSS3 animations (because animations don't transition
        // back to an original state).
        pixelThreshold = elem.isVisible && !elem.group.animatesWithTransitions ? 0 : pixelThreshold; 
        
        // An elem is visible if any one pixel of elem 
        // (not accounting for threshold) is visible within the viewport.
        // For pixelThreshold, we can imagine it as adjusting where the
        // elem is at in the viewport (e.g., for the case of top, pushing
        // it back down the viewport), and then seeing if any one pixel is
        // still visible (i.e., its top would still be < windowHeight). 
        elem.isVisible = 
            ((elem.top + pixelThreshold) < windowHeight) && ((elem.bottom - pixelThreshold) > 0);
    };

    /**
     * converts data-eca threshold
     * attr to its correct percent.
     *
     * @param {number} threshold
     * @returns {number} 
     */
    eca.animatable.convertThreshold = threshold =>
    {
        const conversionTable = {
            "0": 0,
            "0.25": 0.25,
            "0.5": 0.5,
            "0.75": 0.75,
            "1": 1
        };

        // convert to Number first to handle all cases such 
        // as 0.5, .5, 0.50, 0.50000, etc... 
        return conversionTable[ Number(threshold) ] || 0; 
    }

    /**
     * sets the threshold of an elem
     * based on its size compared to
     * the window.
     *
     * @param {number} threshold
     * @param {eca.animatable.Elem} elem
     * @returns {void}
     */
    eca.animatable.correctThreshold = elem =>
    {
        const {
            target,
            originalThreshold
        } = elem; 

        const {
            windowHeight
        } = eca.state; 

        if (0 === originalThreshold)
        {
            return; // because no threshold/nothing to correct
        }

        // NOTE ABOUT CHANGE -- on DCL, using elem bottom minus top can get wrong height value since 
        // props initially set before load and hence potentially before a stylesheet is loaded, 
        // which would then potentially give us new (and different) bottom and top values.
        const elemHeight = target.getBoundingClientRect().height; 

        // if elem is bigger than window, we need to correct threshold else Intersection Observer
        // might never fire (e.g., threshold of 1 would need to be rounded down to the next 
        // closest threshold at 0.75, because 100% of the elem could never be in the viewport)
        if (elemHeight > windowHeight)
        {
            const winPercentOfEl = windowHeight/elemHeight;

            const nextSmallestThreshold = [0, 0.25, 0.5, 0.75, 1]; 

            let i = nextSmallestThreshold.length - 1; 

            while (winPercentOfEl < nextSmallestThreshold[i])
            {
                i--;
            }

            elem.threshold = nextSmallestThreshold[i] <= originalThreshold ? nextSmallestThreshold[i] : originalThreshold; 
        }
        else 
        {
            elem.threshold = originalThreshold;
        }        
    }

    /**
     * fn finds a specific elemGroup with groupId
     * in the eca.animatable.elemGroups array.
     * Fn not used in the app here but useful if user wants to provide their
     * own custom animation for 
     * some ElemGroup obj in eca.animatable.elemGroups. 
     *
     * @param {string} groupId - unique id of element group ECA tracks. Id is always
     *     first class of classList (note: must add -letters to class if animating letters).
     * @returns {(eca.animatable.ElemGroup|void)} 
     */
    eca.animatable.getElemGroup = groupId =>
    {
        const foundGroup = 
            eca.animatable.elemGroups.find(({groupId: id}) => id === groupId); 

        // WARNING!!! SEALING OBJECT!!! 
        // Sealing simply because this fn is part
        // of our public API, and though the user
        // needs the same ref to elemGroup ECA
        // internally operates on (i.e., it's not a clone), 
        // we don't want them deleting or adding props.
        Object.seal(foundGroup) && foundGroup.elems.forEach(elem => Object.seal(elem)); 

        return foundGroup;
    };

    /**
     * returns list of all elemGroups 
     * with id that includes groupId.
     *
     * @param {string} groupId - unique id of element group ECA tracks. Id is always
     *     first class of classList (note: must add -letters to class if animating letters).
     * @returns {eca.animatable.ElemGroup[]} 
     */
    eca.animatable.getAllElemGroups = groupId =>
    {
        const foundGroups = eca.animatable.elemGroups.filter(({groupId: id}) => id.includes(groupId)); 

        // WARNING!!! SEALING OBJECTS!!! 
        foundGroups.forEach(group => Object.seal(group) && group.elems.forEach(elem => Object.seal(elem))); 

        return foundGroups; 
    };

    /* ANIMATION FUNCTIONS (FOR SCROLL)
    =================================================================================
    =================================================================================
    */
    
    /**
     * Wrapper around requestAnimationFrame.
     * Fn reads values (e.g. pos coords) then applies updates (adds classes, writes styles, etc)
     * to the DOM while creating an exclusive lock to stop other 
     * updates from happening until it's done--a concern given 
     * we use this as the handler for both scroll and resize
     * event listeners. 
     * 
     * This is the main entry point into our "animation" functions. 
     * This is mainly used with the readAll and updateAll fns, but
     * we leave it generalized (readCb/updateCb) because scroll and Intersection Observer
     * both have two distinct ways of reading then updating the DOM. 
     * Overall, leaving it generalized also lets us support any method of reading
     * and updating the DOM (implementations via new web apis released
     * in the future, or via our own logic if we decide on a new approach).
     *
     * @param {function} readCb - callback function to read values before animation begins
     * @param {function} updateCb - callback function to update (write to) the DOM in some way
     * @returns {void} 
     */
    eca.animatable.requestAnimationUpdate = (readCb, updateCb) =>
    {
        // need to check if updating because scroll 
        // and resize listeners use this handler and both
        // can fire at the same time on resize events, 
        // giving us two updates in the same frame.
        if ( !eca.state.updating ) 
        {
            eca.state.updating = true; 

            // Note: below, we apply the 
            // read all then update/write all
            // pattern to avoid layout thrashing

            // do batch reading (e.g., of all elem coords)
            // not needed though if just writing
            // (e.g., animating from 0 -> 100px right)
            readCb();

            // do batch updating (write styles, add animation class, etc)
            // at frame end which avoids style conflicts with, for instance, 
            // any event listeners set that change styles
            requestAnimationFrame(ts => 
            {
                updateCb(ts);
                eca.state.updating = false;
            }); 
        }
    };
   
    /**
     * conditionally calls readOne for all
     * elemGroups ECA tracks
     * 
     * @returns {void}
     */
    eca.animatable.readAll = () =>
    {
        const {
            elemGroups,
            readOne
        } = eca.animatable;

        elemGroups.forEach(elemGroup =>
        {
            const {
                removesAnimationWhenNotInView,
                isFinishedAnimating,
                isDelaying
            } = elemGroup;

            if ( (removesAnimationWhenNotInView || !isFinishedAnimating) && !isDelaying )
            {
                readOne(elemGroup); 
            }
        });    
    };

    /**
     * Read all pos coords for one elemGroup. 
     * 
     * @param {eca.animatable.ElemGroup} elemGroup - instance of ElemGroup
     * @param {eca.animatable.Elem[]} elemGroup.elems - array of Elem instances
     * @returns {void}
     */
    eca.animatable.readOne = ({elems}) =>
    {
        elems.forEach(eca.animatable.calculateVisibility);
    };

    // On below fn being same as readAll: could've just
    // looped elemGroups each time with the conditions,
    // but that's long and ugly. Could also abstract it
    // into a separate fn that calls cb but that's also 
    // ugly (e.g., loopAll(readOne), loopAll(writeOne))
    // and perhaps confusing. 
    // This is just more explicit, at the expense of 
    // a bit of repetition. 

    /**
     * conditionally calls updateOne for all 
     * elemGroups ECA tracks
     * 
     * @returns {void}
     */
    eca.animatable.updateAll = () =>
    {
        const {
            elemGroups,
            updateOne
        } = eca.animatable;

        elemGroups.forEach(elemGroup =>
        {
            const {
                removesAnimationWhenNotInView,
                isFinishedAnimating,
                isDelaying
            } = elemGroup;

            if ( (removesAnimationWhenNotInView || !isFinishedAnimating) && !isDelaying )
            {
                updateOne(elemGroup); 
            }
        });           
    };

    /**
     * update or delay animations for one ElemGroup
     *
     * @param {eca.animatable.ElemGroup} elemGroup - instance of ElemGroup
     * @returns {void}
     */
    eca.animatable.updateOne = elemGroup =>
    { 
        const {
            delayGroup,
            updateAnimations,
            updateMutableProps
        } = eca.animatable;

        const {
            groupDelay,
            isVisible,
            elems
        } = elemGroup; 

        if ( groupDelay > 0 && isVisible)
        {
            delayGroup(elemGroup); 
            return;
        }

        elems.forEach(updateAnimations);

        updateMutableProps(elemGroup); 
    };

    /**
     * Fn delays the whole group. Note: this is not an actual CSS animation delay
     * but a delay before even CSS delays are added. Basically,
     * this fn delays processing (adding or removing the animation) 
     * of the ElemGroup until the delay is finished. 
     *
     * @param {eca.animatable.ElemGroup} elemGroup - instance of ElemGroup
     * @returns {void}
     */
    eca.animatable.delayGroup = elemGroup =>
    {
        elemGroup.isDelaying = true;
        elemGroup.originalGroupDelay = elemGroup.groupDelay; 
        
        elemGroup.delayId = setTimeout(() =>
        {
            eca.state.groupDelayIds[elemGroup.groupId] = null;           
            
            // set groupDelay to 0 since groupDelay is only supposed to 
            // be applied once to all elems as a whole
            // and subsequent calls to animate, for unanimated elems in
            // elemGroup.elems array, shouldn't delay as group again
            elemGroup.groupDelay = 0; 
            elemGroup.isDelaying = false; 

            // get possible new positions for elemGroup 
            // (user could've scrolled since delay start, and 
            // no point playing animation if user can't see it)
            eca.globals.useScroll && eca.animatable.readOne(elemGroup); 
            requestAnimationFrame(() => eca.animatable.updateOne(elemGroup)); 
            
        }, elemGroup.groupDelay);   
        
        // below is useful if user uses trackingFn on elemGroup and wants to 
        // cancel the group's delay
        eca.state.groupDelayIds[elemGroup.groupId] = elemGroup.delayId; 
    };

    /**
     * updates props likely to change each iteration.
     * 
     * @param {eca.animatable.ElemGroup} elemGroup - instance of ElemGroup
     * @returns {void}
     */
    eca.animatable.updateMutableProps = elemGroup =>
    {
        // need to reset this since each time update is called,
        // each time a scroll event happens, we want delays on 
        // the rest of elems of some group to be calculated as if
        // it were a separate group. 
        elemGroup.nextStaggeredDelay = null;
            
        if (0 === elemGroup.numElemsAnimated) 
        {
            // reset groupDelay because we may have come out of
            // group delay with canceled animation (and it's set to 0 there)
            // or user may have set removesAnimationWhenNotInView option 
            // which gives elems chance to animate/delay again
            elemGroup.groupDelay = elemGroup.groupDelay || elemGroup.originalGroupDelay; 
        }
    };

    /**
     * fn decides whether to animate or remove animation 
     * from elem
     *
     * @param {eca.animatable.Elem} elem - instance of Elem
     * @returns {void}
     */
    eca.animatable.updateAnimations = elem =>
    {
        const {
            animate,
            deAnimate
        } = eca.animatable;

        if ( elem.isReadyToAnimate )
        {
            animate(elem);    
        }
        else if ( elem.isReadyToDeanimate )
        {
            deAnimate(elem);
        }
    };

    /**
     * sets delay and adds eca-animated class to 
     * elem
     *
     * @param {eca.animatable.Elem} elem - instance of Elem
     * @returns {void}
     */
    eca.animatable.animate = elem =>
    {

        const {
            delay,
            uniqueDelay,
            group: elemGroup,
            target // actual Element from HTML
        } = elem; 

        // if null, either no delay (same as zero
        // but not explicitly set)
        // unless a CSS/transition delay is specified
        // via CSS
        if (delay !== null)
        {
            target.style[
                elemGroup.animatesWithTransitions 
                    ? 
                        "transitionDelay" 
                    : 
                        "animationDelay"
            ] = delay + "ms";
        }                    

        // Use below check
        // because elems with unique delays don't participate in 
        // the stagger, so in that case we want keep the current
        // stagger (that's already been set previously)
        // for the next elem that uses it
        if ( !uniqueDelay )
        {
            elemGroup.updateNextStaggeredDelay();   
        }    
        
        target.classList.add('eca-animated');
        elem.isAnimated = true; 
    };

    /**
     * removes eca-animated class from elem;
     * resets inline styles
     *
     * @param {eca.animatable.Elem} elem - instance of Elem
     * @returns {void}
     */
    eca.animatable.deAnimate = elem =>
    {
        elem.target.classList.remove('eca-animated');
        elem.isAnimated = false;
        elem.target.style.cssText = elem.originalInlineStyles; 
    };

     /* ANIMATION FUNCTIONS (FOR INTERSECTION OBSERVER)
    ==============================================================
    ==============================================================
    */

    /**
     * Cb for new IntersectionObserver, reads entries' props, then
     * updates the DOM based on them
     *
     * @param {IntersectionObserverEntry[]} entries - list of IntersectionObserverEntry objs
     * @param {IntersectionObserver} observer - observer that runs this cb
     * @returns {void}
     */
    eca.animatable.handleIntersect = (entries, observer) =>
    {
        const {
            scrollY, 
            prevScrollY, 
            windowHeight, 
            elemsUpdatedAtY
        } = eca.state;

        const {
            requestAnimationUpdate, 
            readEntries, 
            updateEntries
        } = eca.animatable; 

        const userHasScrolled = prevScrollY !== scrollY; 

        if ( userHasScrolled )
        {
            elemsUpdatedAtY[scrollY] = new Map(); 
        }

        // maps an elemGroup to its elems that are entries
        // (each entry.target is the same elem.target).
        // Entries will always be a subset of their 
        // original ElemGroup, but could be
        // either an improper or proper subset
        const groupSubsets = new Map(); 
        
        requestAnimationUpdate(
            () => readEntries(entries, groupSubsets, observer), 
            () => groupSubsets.size > 0 && updateEntries(groupSubsets)
        );

        eca.state.prevScrollY = scrollY; 
        eca.state.prevWindowHeight = windowHeight; 
    };

    /** 
     * does all the reading of each entry's props to see if we should update
     * its target/associated elem instance
     *
     * @param {IntersectionObserverEntry[]} entries
     * @param {Map} groupSubsets - associates an elemGroup with its elems 
     *     that are currently IO entries 
     * @returns {void}
     */
    eca.animatable.readEntries = (entries, groupSubsets, observer) =>
    {
        // Important Reminder About Entries: an entry.target may 
        // have multiple associated entries, each with a different
        // time of intersection. Not at all important for the 
        // functioning of this app, but it definitely lead to
        // confusion at points in the development of the app
        // so it's worth remembering. 
        
        entries.forEach(entry => 
        {
            const {
                shouldSkipUpdate, 
                calculateVisibilityIO,
                saveElemRefForUpdate,
                Elem
            } = eca.animatable; 

            // so we know which Elem instance
            // is associated with this entry (the 
            // entry.target is the same elem.target)
            const elem = Elem.getElem(entry.target);       
         
            if ( shouldSkipUpdate(elem, entry, observer) )
            {        
                return; 
            }

            calculateVisibilityIO(elem, entry); 

            saveElemRefForUpdate(elem, groupSubsets); 
        });
    };

    /**
     * delays or updates animations 
     * for entries of groupSubsets
     * 
     * @param {Map} groupSubsets - associates an elemGroup with its elems 
     *     that are currently IO entries 
     * @returns {void}
     */
    eca.animatable.updateEntries = groupSubsets =>
    {
        groupSubsets.forEach((entries, elemGroup) =>
        {
            const {
                updateMutableProps,
                updateAnimations,
                delayGroup
            } = eca.animatable;

            const {
                isDelaying,
                groupDelay,
                animatesAllOnFirstSight,
                isVisible
            } = elemGroup; 
            
            if ( isDelaying )
            {
                return;
            }
            else if ( groupDelay > 0 && isVisible)
            {
                delayGroup(elemGroup); 
                return;  
            }     
            
            if (animatesAllOnFirstSight) // for all elems of an ElemGroup
            { 
                elemGroup.elems.forEach(updateAnimations); 
            }
            else // for subset of an ElemGroup
            {
                entries.forEach(updateAnimations); 
            }

            updateMutableProps(elemGroup); 
        });
    };

    /**
     * Fn tells us if we should bother updating this elem 
     * (adding or removing animations to its target) based
     * on current scrollY and elem's corresponding entry props.
     * Also, fn controls whether elem should be observed,
     * since whether it's updated or not is sometimes tied to
     * whether it should be observed or not.
     *
     * @param {eca.animatable.Elem} elem - instance of Elem whose target is
     *      the current entry.target
     * @param {IntersectionObserverEntry} entry
     * @param {IntersectionObserver} observer
     * @returns {boolean}  
     */
    eca.animatable.shouldSkipUpdate = (elem, entry, observer) =>
    {

        // Terms used below: IO = Intersection Observer. IR = 
        // intersection ratio

        // The general idea behind updating elems is to only update
        // them if they haven't been updated yet--a concern given 
        // the Intersection Observer instance we create is registered
        // with multiple thresholds (only one of which will apply to 
        // any one elem) and thresholds determine an elem's
        // visibility/animation trigger/removal point. For example,
        // we might only want to consider an elem visible--visible
        // enough to where a user could notice an animation for it--when at least
        // 25% percent of its pixels are visible to the user, which
        // is what the threshold setting allows us to do. 
        // 
        // For instance, if an elem was already visible/animated 
        // and handleIntersect fires again, because the user was scrolling 
        // causing the elem to cross a new threshold becoming more visible 
        // (e.g., going from > 25% visibility to > 50%),
        // then there's no reason to process/update it again (likewise
        // if it's not visible and becoming less visible). 
        // 
        // Also, we keep track of which elems were updated at the 
        // current scrollY position, and so if we see the elem
        // again at the same scrollY, we likewise skip
        // updating it again. This stops infinite loops from happening
        // where IO's cb keeps firing repeatedly. 
        // 
        // Here's an example case: consider a user stays at the same scrollY
        // while a fade up into view transition plays. If the user
        // loads the page at a point where the elem is close to the top 
        // of the page, then the elem could fade up out of view completely,
        // causing IO's cb to fire again, which could reset the animation, 
        // which in turn resets the elem to its original position (IR=1), 
        // which in turn causes IO's cb to fire again and add the 
        // animation again causing it to fade up out of view again (IR=0), etc... 


        const {
            // same as elem.target.
            // the underlying Element obj from
            // the HTML/document
            target
        } = entry;

        if ( elem.group.playsOnLoad )
        {
            // unobserve since above option
            // means an elem plays once
            // and it's done.
            observer.unobserve(target);
            return false; 
        }
        else if ( !elem.group.removesAnimationWhenNotInView && elem.isAnimated )
        {
            // same as playsOnload,
            // we're done with elem at this
            // point--only difference is the
            // elem has already been updated 
            observer.unobserve(target);
            return true; 
        }

        const {
            prevScrollY, 
            scrollY, 
            elemsUpdatedAtY, 
            prevWindowHeight, 
            windowHeight
        } = eca.state; 

        const userDidntScroll = prevScrollY === scrollY;
        const userDidntResizeWindow = prevWindowHeight === windowHeight; // need to check to allow resizing to update an elem
        const elemUpdatedAtThisScrollY = elemsUpdatedAtY[scrollY].has(elem);  
        
        // if true this means some animation (translation of some sort) caused elem to 
        // cross a threshold and fire observer again even though user didn't scroll again.
        if ( userDidntScroll && userDidntResizeWindow && elemUpdatedAtThisScrollY ) 
        {
            // then don't update again.
            // In fact, we unobserve it so it doesn't potentially keep
            // firing IO's CB. Then when we scroll again, we'll reobserve them
            // so their coords stay fresh. 
            observer.unobserve(target); 
            eca.state.unobservedElems.push(elem); 

            // since the unobserved elem will 
            // be reobserved upon a new scrollY 
            // event (have new pos recorded, etc),
            // this is guaranteed to be an up-to-date
            // elem (latest/correct pos coords)
            elem.group.upToDateELem = elem; 
            return true;  
        }

        const elemWasVisible = elem.isVisible; // stale at this point
        const elemStillVisible = entry.intersectionRatio > elem.threshold;
        // can't just ! op with above const since that would wrongly skip cases
        // where IR = 1 and thres = 1 (or both 0) 
        const elemStillNotVisible = entry.intersectionRatio < elem.threshold;

        // NOTE: Usually this means user is at a different scrollY 
        // (i.e., user is scrolling), but we may also reach here
        // if the user is resizing the window, or
        // if an elem is being carried, via Y translation, by a 
        // parent elem, causing it to cross a threshold. We may 
        // then be at the same scroll Y still but elem was never
        // added to elemsUpdatedAtY map because it previously passed below
        // check.
        // NOTE 2: keep in mind that isVisible is true when 
        // intersection ratio > threshold, and is false when 
        // IR < threshold. Therefore, isVisible is purposely stale 
        // at this point (hence elemWasVisible), else this would always be true. 
        // elemStillVisible reflects current elem state. 
        // This is needed because we support 5 thresholds
        // but want to ignore all others, all intersection ratios,
        // that don't apply to this entry.
        if ( ( elemWasVisible && elemStillVisible ) 
            || ( !elemWasVisible && elemStillNotVisible) )
        {      
            return true; 
        }            

        return false; 
    };

    /**
     * sets isVisible field of elem 
     * based on whether its intersection 
     * ratio meets the elem's threshold 
     * setting. 
     * 
     * (when using Intersection Observer, IO)
     *
     * @param {eca.animatable.Elem} 
     * @param {IntersectionObserverEntry} entry
     * @returns {void}
     */
    eca.animatable.calculateVisibilityIO = (elem, entry) =>
    {
        const {
            boundingClientRect: {top, bottom}
        } = entry;

        const {windowHeight} = eca.state; 

        const elemPartlyOutsideViewport = (top < 0 || bottom > windowHeight); 

        // save new top and bottom because
        // we still need for isReadyToDeanimate check
        elem.top = top; 
        elem.bottom = bottom; 

        if (entry.isIntersecting)
        {
            if (elem.isVisible && !elem.group.animatesWithTransitions)
            {
                // return because when using CSS3 animations
                // (i.e., not using transitions), we don't want 
                // to consider the elem not visible until it's 
                // not intersecting anymore (and since we know it's
                // still intersecting there's nothing more to do here). 
                return; 
            }

            if (entry.intersectionRatio < 1)
            {
                // we need to repeat the elemPartly... check twice below because 
                // sometimes Intersection Observer (IO) will erroneously fire when the Intersection Ratio
                // is less than 1 while at the same time reporting elem's BoundingClientRect top
                // AND bottom coordinates as being somewhere in the middle of the viewport (an elem
                // smaller in height than viewport should always be partially outside viewport in
                // such a case)
                if (entry.intersectionRatio > elem.threshold && elemPartlyOutsideViewport)
                {
                    elem.isVisible = true;
                }
                else if (entry.intersectionRatio < elem.threshold && elemPartlyOutsideViewport) 
                {
                    elem.isVisible = false;                       
                }
            }
            else 
            {
                elem.isVisible = true;  
            }
        }
        else 
        {
            elem.isVisible = false;                       
        }
    };

    /**
     * saves elem ref to correct group subset, which we'll perform the 
     * update on, and maps elem to scrollY it was updated at
     *
     * @param {eca.animatable.Elem} elem - instance of Elem whose target is also the
     *      entry.target (underlying Element from HTML/document)
     * @param {Map} groupSubsets - associates an elemGroup with its elems 
     *     that are currently IO entries
     * @returns {void}
     */
    eca.animatable.saveElemRefForUpdate = (elem, groupSubsets) =>
    {
        const {group: elemGroup} = elem; 
        const {elemsUpdatedAtY,scrollY} = eca.state; 

        // because its coords are fresh,
        // so by this point it's 
        // guaranteed to be up-to-date. 
        elemGroup.upToDateELem = elem; 

        if (groupSubsets.has(elemGroup))
        {
            groupSubsets.get(elemGroup).push(elem);
        }
        else 
        {
            groupSubsets.set(elemGroup, [elem]);
        }

        // doesn't matter what we map elem to, since
        // we're just using it for quick access to 
        // elems at some scrollY. (For debugging,
        // it's useful to map elem to its time of 
        // intersection.)
        // Note: elem is mainly added here after user
        // scrolls; however, elem could also be added
        // here via a translation of some sort (when 
        // user isn't scrolling), its own translation
        // or via a parent elem, causing it to cross
        // a threshold. 
        elemsUpdatedAtY[scrollY].set(elem, true);   
    };

     /**
     * Fn stores window.scrollY each time it is
     * called (fn is used in scroll handler, but
     * is only used with Intersection Observer to add
     * functionality).
     * 
     * Note: we do not store a new scroll event
     * if user did not initiate it (e.g., on page
     * load a scroll event may automatically
     * fire twice in quick succession).
     *
     * @returns {void} 
     */
    eca.animatable.updateScrollY = () =>
    {
        const scrollY = window.scrollY; 

        // need this guard because sometimes 
        // scroll can fire multiple times
        // on page load or reload and we only
        // want to update scrollY if it actually
        // changes
        if (scrollY === eca.state.scrollY)
        {
            return; 
        }

        // conditional below just prevents setting prev until Intersection Observer 
        // CB has run for the first time (so we don't mistakenly think we're at a repeated
        // scrollY pos yet). 
        eca.state.prevScrollY = eca.state.prevScrollY !== null ? eca.state.scrollY : null;
        eca.state.scrollY = scrollY;  
        eca.state.elemsUpdatedAtY = {}; 
    };
  
    
    /* APP LISTENERS
    ==============================================================
    ==============================================================
    */

    // save global data-eca attrs
    // so we don't have to keep reading them later
    eca.ready(eca.helpers.saveGlobalOptions); 

    eca.ready(eca.animatable.readyElementsForAnimation); 
    
    eca.ready(function runInitialAnimations()
    {
        const {
            requestAnimationUpdate,
            readAll,
            updateAll
        } = eca.animatable; 
        
        // only if we're using the scroll implementation.
        // When we register the callback for Intersection
        // Observer and tell it to observe our elems, 
        // the cb will fire and take care of the initial 
        // update for us. 
        eca.globals.useScroll && requestAnimationUpdate(readAll, updateAll);
    });
    
    eca.ready(function animateElemsOnScroll()
    {
        // useScroll automatically defaults to true
        // if browser doesn't have Intersection Observer (IO)
        // but user could also explicitly choose to use scroll instead of IO
        if ( eca.globals.useScroll )
        {
            const {
                requestAnimationUpdate,
                readAll,
                updateAll
            } = eca.animatable; 
    
            const {
                listen,
                throttle
            } = eca.helpers; 

            const {
                throttleLimScroll
            } = eca.globals; 

            function ecaHandleScrollAnimations()
            {
                requestAnimationUpdate(readAll, updateAll); 
            }

            listen(window, "scroll", (throttleLimScroll
                ? 
                    throttle(ecaHandleScrollAnimations, throttleLimScroll)
                : 
                    ecaHandleScrollAnimations
            ));
        }
        else // use Intersection Observer for scroll animations
        {
            const {
                handleIntersect,
                elemGroups,
                updateScrollY
            } = eca.animatable; 
    
            const {
                listen
            } = eca.helpers; 

            const animatableObserver = new IntersectionObserver(handleIntersect, { threshold: [0, 0.25, 0.50, 0.75, 1] });
         
            elemGroups.forEach(({elems}) => elems.forEach(({target}) => animatableObserver.observe(target)));
    
            function reobserveElems()
            {
                // reobserve since we're either at new scrollY, or have new resize event, and need to see
                // if their intersection ratios have changed
                eca.state.unobservedElems.forEach(({target}) => animatableObserver.observe(target)); 
                eca.state.unobservedElems = []; 
            }

            function ecaHandleNewScrollY()
            {
                updateScrollY(); 
    
                reobserveElems(); 
            }
    
            listen(window, "scroll", ecaHandleNewScrollY);
            // below we have to reobserve since 
            // we also use IO to animate elems on resize
            listen(window, "resize", reobserveElems); 
        }
    });
    
    eca.ready(function animateElemsOnResize()
    {         
        const {
            requestAnimationUpdate,
            readAll,
            updateAll,
            elemGroups,
            correctThreshold
        } = eca.animatable; 

        const {
            listen,
            throttle
        } = eca.helpers; 

        const {
            throttleLimResize,
        } = eca.globals; 

        function ecaHandleResize()
        {
            // need new windowHeight first so elems can 
            // know where they're at inside viewport
            eca.state.prevWindowHeight = eca.state.windowHeight;
            eca.state.windowHeight = document.documentElement.clientHeight; 

            // need below because animation might not trigger if elem becomes
            // bigger than window and threshold is not corrected
            // NOTE: in order to correctly set an elem's
            // threshold, we need to handle resize for both
            // the window and the elems ECA is tracking
            // because the window resizing doesn't always
            // correspond to when an elem resizes--it 
            // might resize an elem of course, but elems
            // can be resized via a separate event or 
            // via custom logic of some sort. ECA originally
            // used Resize Observer with a window resize event
            // to implement the above logic, but Resize Observer
            // (latest Chrome and Firefox) was bugged, 
            // reporting faulty sizes when an elem translates
            // (see bug report). 
            elemGroups.forEach(({elems}) => elems.forEach(correctThreshold)); 
            
            // useScroll check because if we're using IO, that also handles new 
            // intersections from resizing window
            eca.globals.useScroll && requestAnimationUpdate(readAll, updateAll); 
        }

        listen(window, "resize", (throttleLimResize 
            ? 
                throttle(ecaHandleResize, throttleLimResize)
            : 
                ecaHandleResize
        ));
    }); 

    const publicApi = {
        ready: eca.ready,
        readyAll: eca.readyAll,
        listen: eca.helpers.listen,
        listenAll: eca.helpers.listenAll,
        getElemGroup: eca.animatable.getElemGroup,
        getAllElemGroups: eca.animatable.getAllElemGroups,
        groupDelayIds: eca.state.groupDelayIds
    }

    return publicApi; 

})(); 

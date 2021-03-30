# ECA

*Easier/Enhanced CSS3 Animations (ECA)*

ECA is a library that extends the functionality of CSS3 animations. With ECA, you can animate elements on scroll, animate text with ease, easily set event listeners for pre/post animation, reverse 
animation order, modify non animatable properties (e.g., display, position), create animation groups, and add staggered delays to elements--all without you writing a single line of JavaScript. 

## Table of Contents
* [Why make this project](#why-make-this-project)
* [Installation](#installation)
* [Basic Use](#basic-use)
* [Advanced Use](#advanced-use)
   - [Advanced Use Examples and Further Explanation](#advanced-use-ex)
      - [data-eca-offset](#offset)
      - [data-eca-remove-animation-when-not-in-view](#reset-animation-state)
      - [data-eca-animate-all-on-first-sight vs default app behavior](#animate-all-vs-default)
      - [data-eca-listen](#listen)
      - [data-eca-char-delays](#char-delays)
      - [data-eca-group-delay](#group-delay)
      - [tracking function](#tracking-fn)
* [Identical Element Group Names and Animation Order](#distinct-element-names)
* [Limitations](#limitations)
* [Future Updates](#future-updates)
* [Make Your Animations Meaningful](#give-animations-meaning)

## Why make this project? What makes it unique out of all the animation libraries available? <a name="why-make-this-project"></a>

Native CSS animations are robust but they're missing a few key features that would make them truly useful, such as animating elements only when the user can see them, or easily animating groups of elements in sequence. Most animation 
libraries exist to enhance the functionality of CSS animations, and others exist to override the functionality completely, replacing it with their own animation engine (mostly for performance reasons). 

There exists, for instance, a few animation libraries (ones that use CSS, not their own engine) that add animations on scroll like mine, but they're all rather inflexible: they force the user to use predefined animations (actually, most support only transitions, not animations),
associate each element with their respective animation and delay manually (a pain if you have multiple elements you want animated), and require the user to write some amount of JavaScript to set it all up. And if the user wants more out of these libraries
they have to add verbose CSS to define their own animations (and even more CSS for adding a single delay value). 

These libraries are so concerned with making it easy to animate (transition) single elements (which they do) that they accidentally make it harder to animate groups, or do anything 
not predefined by the library. Its ease of use is what ends up making it so rigid. 

In my opinion, we should be able to use CSS3 animations per the spec, written in CSS. Predefined animations are well and good, but we should not be forced to write new ones following guidelines set forth by a library. We should be able to write our css in a separate file, define the animations 
we want there for elements and their respective classes (or use some predefined CSS animation library without hassle), and have it act how we want it without touching JavaScript--all which 
ECA does. 

JS animation engines, on the other hand, are much more flexible but usually involve writing code 
of the following form: 

1. select elements to animate/extend functionality of from the DOM

```
const element1 = document.querySelectorAll('.some-element-class');
setupElementForAnimation(element1) //maybe get coordinates on page or add some initial properties to element
animateProps('x: 50 to x: 100')  
const element2 = document.querySelectorAll('.another-element-class');
.....
const element50..... 
```

2. And more code to sort elements into groups. 

This could all add up to potentially many hundreds of lines of code. And the code ends up looking the same too even if you're 
doing your own custom animation work on elements (say, if you've made a simple scroll position detector). 

Whatever the case, ECA does away with all that work by automating the above type of code for you. 

## Installation <a name="installation"></a>

Download the zip file <a href="https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/plakich/eca/blob/main/eca.js">here</a>, extract eca.js from the zip, place eca.js in the appropriate directory based on your project structure, and place a script tag in your HTML like so

`<script type="text/javascript" src="eca.js"></script>`

(Thanks to <a href="https://github.com/MinhasKamal/DownGit#how-to-use">Minhas Kamal</a> and the DownGit project for the above link.)

## Basic Use <a name="basic-use"></a>

While the library offers a ton of custom options to make more out of CSS3 animations, at its simplest,
to animate elements on scroll, you simply 

1. add the animate (present tense) class in your HTML to whatever element group you want animated
(making sure said elements have the same class name first in the list of its classes)

2. set an optional delay to be staggered based on multiples of the delay set (so you don't have to set it on each element)

3. define the animated (past tense) class in your CSS on the elements' class with the accompanied animation you want to use.

The library does the rest of the work for you. You don't have to write a single line of JavaScript. (You don't have to write the animations yourself either. If you want, 
you could just as easily use a library like <a href="https://animate.style/">animate.css</a>, which has a bunch of predefined animations ready for use.)

For example, in HTML you might write (making sure this is the first element in a group of like elements, if it's part of a group)
```
<div class="box animate" data-eca-stagger="100ms" > //this delay is staggered so the next element would get a 200ms animation-delay by default (or the first can be zero and next 100, see advanced use below)
<div class="box"></div>
<div class="box"></div>
<div class="box dont-animate"></div> //if we don't want to animate one of the elements of the group
...
```
and in the CSS you might write, assuming you've defined an animation called fade-in somewhere:

```
.box.animated {
     animation: fade-in 1s ease-out forwards;
} //animated, past tense
```
And now your box elements will all show up on scroll, with the appropriate delays set (if you don't want staggered delays set, don't set them, 
or if you want to use the same delay for all elements, just set it how you normally would via CSS animation-delay property). 

Another big animation feature of ECA is animating text characters. ECA will wrap the text for you (in spans, for letters, and
divs, for words) so you don't have to manually do it yourself, all the while respecting any other tags you may have in your text, like anchors or other spans. So you can do this, for example.

`<h1 class="hero__hero-text animate-chars">Our Very Long Hero Text!</h1>`

Adding the animate-chars class to any text with transform it, after the page loads, like so: 
```
<h1 class="hero__hero-text animate-chars" data-eca-stagger="25ms" aria-label="Our Long Hero Text!">
	<div class="word" aria-hidden="true">
		<span class="letter">O</span><span class="letter">u</span><span class="letter">r</span>
	</div> 
                ...etc
</h1>
```
Then you might add an animation in CSS like so:
```
.hero__hero-text .letter.animated {
	animation: bounce 1s ease-in forwards; 
}
```
And don't worry: ECA keeps accessibility in mind too, so screen readers can
still read your text (that's what the aria-label is there for). 

By the way, you're not limited to a single animation per element. The library doesn't change the way CSS works: it just helps it do more. So you could still, for instance, 
use the nth-of-type selector to have one set of elements play with one animation and another set play a different one, resulting in a completely new animation. 

## Advanced Use <a name="advanced-use"></a>

There are quite a few options that ECA uses to help you tweak and refine your animations to fit your use case. 

Many of the below options can either be set as a global option, on the HTML
element of your page, or overridden on a per element basis. Others are simply global options or element options. **Note, none of these options are required.** 

**By default, ECA assumes the following are true:**

* the user is using animations, not transitions, for animations (i.e., ECA sets the animation-delay property when the user specifies a staggered delay)
* staggered delays should start at the number specified, not zero (e.g., data-eca-stagger="100" will set the first element's delay as 100ms, the next as 200, not 0 for the first and 100 for the second)
* elements should animate when their top touches the viewport bottom (no offset by default)
* animations should only play once (e.g., if the user scrolls back up above the element, the element's animation will not reset and then play again when it comes back into view). 

The full list of options is below. Options that can be set globally (applying to every element group) and per element group are marked with a 'g' and an 'e' (g/e). Per element group options are marked with just an 'e' (e) and global with just a 'g' (g). Options marked with an asterisk (*) can be set on each element of a group. 
**All the options are set, each as an attribute on an element, by prefixing them with data-eca (e.g., data-eca-offset="200").**


| Option        | Description   | Example Value | Default Value | Max Value                                                     |
| ------------- |---------------|---------------|---------------|---------------------------------------------------------------|
| offset (g/e)  | Pixel offset from an element's top when it should be considered in view and animatable |   100       |       0        | Element's Height
| remove-animation-when-not-in-view (g)     | When the element is scrolled out of view (i.e., viewport is above element), then the animation will be removed from the element giving it a chance to animate again when it comes back into view.       |   true         |      false       |                                                               |         
| stagger-from-zero (g/e) | Start staggered delay from zero (e.g., data-eca-stagger="100" the first element will have no delay, the second 100, and so on.)      |    true         |     false          |                                                               |
| play-on-load (g/e)             | Animations will play on load, not on scroll. This is the default CSS behavior, of course. You might set this if you just want to only use the delay feature of the library.              |     true          |       false        |                                                               |
| animate-all-on-first-sight (g/e)              | When one element of a group comes into view, all of the rest will also be animated, regardless of whether they're visible or not              |    true           |      false         |                                                               |  
| animate-with-transitions (g/e)              | Affects delays and listeners set (e.g., if set to true, delays will be transition delays and listeners set with end will be transitionend).              |   true            |   false            |                                                               |
| stagger (g/e)              | Stagger a group's animation delays by some multiplier. (e.g., data-eca-stagger="100" the first element will have 100ms delay, the second 200, and so on)              |     100ms          |     none          | Approx safe-max-int/group.length                                                              |
| listen (e)              | Set event listeners (in JSON format) on animation/transition start, end, iteration, cancel, run to change styles.               | data-eca-listen=' { "end": "display: inline" } '              |  none             |                                                               | 
| capture (e)              | Set event listener to fire during the capture phase.              | true              | false              |                                                               |
| group-delay (e)              | A delay before any element of a group animates (see below for details)              | 1000ms               | 0              | 2^31 - 1 milliseconds or about 25 days                                                              |  
| reverse (e)              | Reverse order of animation (e.g., first element will now animate last and last will animate first)               | true               | false              |                                                               |    
| duration (e)              | Animation or transition duration. Not used by ECA but useful to set if you use a custom tracking function (see below for details)               | 2s              | none               |                                                               | 
| char-delays (e)              | Specify unique delays (in JSON format) for each text character of a text element              | data-eca-char-delays=' { "1": "200", “3”: “2s” } '              | none              |                                                               |
| delay (*)              | Specify a unique animation delay for some element in a group               | 100ms              | none              |                                                               |

## Examples of Advanced Option Use and Further Explanation <a name="advanced-use-ex"></a>

**Global options are set on the HTML element.** 

`<html lang=”en” data-eca-remove-animation-when-not-in-view=”true” data-eca-stagger-from-zero=”true” data-eca-animate-with-transitions=”true”>`

You can override global options on a per-element-group basis, as we do below for the animate-with-transitions option (**element group options always override ones set globally**). When setting options for an element group you set the option on the first element of said group and they’ll apply to the group as a whole (e.g., all elements in the group will use a 200px offset). 
```
<div class=”box animate” data-eca-offset=”200” data-eca-stagger=”100ms” 
data-eca-reverse=”true” data-eca-animate-with-transitions=”false” data-eca-stagger-from-zero=”false” ></div>
<div class=”box”></div>
<div class=”box”></div>
```
**The only option that can be set per element (not just element group) is the delay option**, which can be set like so. 
```
<div class=”box animate” data-eca-offset=”200” data-eca-stagger=”100ms” data-eca-reverse=”true” 
data-eca-animate-with-transitions=”false” data-eca-stagger-from-zero=”false” ></div> //these are options for whole element group
<div class=”box”></div>
<div class=”box” data-eca-delay=”2s”></div> //delay option is set per element, so the third element will have an animation-delay of 2s instead of 300ms
```
Some important notes about a few of the advanced options:

### data-eca-offset: <a name="offset"></a>

You can set any number you want for this but ECA forces the max to always be half the element height plus half the screen’s height (window.innerHeight). This has to be the max because of how elements are considered to be visible. An element is visible when its top or bottom edge is in the range zero to window height (e.g., assume the screen is a box, the element a smaller box, the bottom of the screen point 0, and the top of the screen to be window Height, whatever the height of the window is). But offset is telling the app to adjust that behavior, to make the top farther down by offset amount. **Essentially, adding an offset to an element is like saying “yes, the top of the element might be past the bottom of the screen (point zero), but pretend it’s farther back still.”** 

**That pretending can lead to buggy behavior if we don’t set a max.** So we do a test. We place an element’s center in the center of the screen (half the window’s height) and calculate the distance from the element’s edge (half the element’s height) to the screen’s opposite edge (half window height plus half element height). This is the max offset because if it’s greater than this it would be saying the element’s edge (when offset is added to the edge) is outside the screen while in the center, which is obviously a bug. 

But even if you stick within that range, no matter what, the element will be considered in view when it’s bottom touches the viewport bottom--so basically **the element’s height is the true max offset.** 

**ECA does this to prevent edge cases where elements are at or near the top or bottom edges of the document.** If an element is flush with the bottom of the document, for instance, it can’t be offset by any more than its height, because the screen isn’t scrollable past that amount.


### data-eca-remove-animation-when-not-in-view: <a name="reset-animation-state"></a>

When set, this option removes the animated class from an element when it’s no longer visible on screen, which effectively removes the animation. If the animate-with-transitions option is set, and assuming the offset option is set as well, the animation will reverse when it’s no longer visible (transition back to its original state). If animate-with-transitions option is not set, and even if the offset option is set, ECA will assume the user is using animations for animations, not transitions, which means only when the element goes completely out of view will the animated class be removed (because there’s no logical way to reverse complex animations, especially those involving transforms). In either case, whether using transitions or animations, setting the remove-animation-when-not-in-view option makes the element animatable again when it comes back into view (i.e., any animation defined for it will play again). 

Note, **this option only removes the animation one way, when the user scrolls back up the page and the element disappears below the viewport.** The other way, when the user keeps scrolling down such that the element disappears above the viewport, does not remove the animation. Although I wrote the app so elements have the chance to animate both ways (whether the user scrolls up to it or down the page to it), I decided to only have the animation state reset one way as explained above. 

I made ECA this way because of how most people define animations. A common animation to see on many pages is the fade up into view one, or having the element rise in some way. If the animation was removed when scrolling down the page (i.e., when the element is above the viewport) the element risks entering a cycle where the animation class is removed, immediately added again (because the user is still scrolling), and then removed again. For this reason, and because most sites have a logical scroll order (i.e., starting at the top, the user scrolls down the page), this option only removes the animation one way, when the element goes back below the viewport. 

### data-eca-animate-all-on-first-sight vs default app behavior: <a name="animate-all-vs-default"></a>

**This option changes the default behavior of the app so that when one element of a group becomes visible, the rest are considered visible as well**--and hence they animate right away, even if the rest aren’t visible. 

By default the app considers elements’ visibility individually. For example, assume a user has two rows of cards, three each row, stretching across the screen (no matter the screen width) with a two hundred pixel gap between rows, and has set a staggered delay of 100ms. When the first row becomes visible, the delays will be 100ms, 200ms, 300ms. But what about the second row? That depends upon the scroll behavior. 

If the user scrolled fast enough such that the second row became visible roughly with the first (a single scroll event revealed enough screen real estate), then the second row’s delays would be 400ms, 500ms, 600ms. Otherwise, the delays would be the same as the first row (100, 200, 300). 

This scroll behavior of the app captures how most people think about using delays. If part of a group is visible at the same time and we want the delays to stagger, then we’d want the first scenario to play out. Else, if the second row is revealed like it has its own group of elements, it should delay like its own group, as in the second scenario. 

However, we may want to change this behavior and always animate a group of elements as a whole (usually elements that stretch to different rows as in the cards example). 

**In the past, I’ve mostly used this for the header text of sections**--which may be large enough, font size wise, and long enough, character wise, to stretch to two rows with some noticeable gap between the rows---when I didn’t want “breaks” in the animation, which could happen if the user didn’t scroll quite enough to reveal the whole title. 

Setting this option ensures the title will always animate as a whole. ( Note, this option can be used with any element group, not just text). 

Finally, **if the user has set the remove-animation-when-not-in-view option along with this option, only when the first element goes out of view will the entire group have all its animations removed.** That is, since all elements animate as a whole, they will reset as a whole as well. 

### data-eca-listen: <a name="listen"></a>

This is used to change styles of an element when animation events fire. This option has to be written in JSON format. The format for that is one single quote ‘ followed by a left bracket { followed by keys in double quotes with a colon following the key, like so “a”: followed by values in double quotes “1”. If you want multiple values, there must be commas between the values. An example listen object is written like so:
```
data-eca-listen=’ { “start”: “position: absolute; background: red”, “end”: “position: fixed; background: grey” }’ 
```
Note the above semicolon between the styles in double quotes. If you happen to mess up writing the listen attribute, open the console and an error will display letting you know which element needs fixing. 

The above listener sets an event listener for animation start and end events, with the following styles changed on each event. **Note, if animate-with-transitions option is set on said element group or globally, then the keys start and end will set a listener for transition start and end respectively, instead of animation start and end.** 

**The values the listener takes, as keys, are run (short for transitionrun event), start, end (for animation/transition start and end events), iteration (for animationiteration), and cancel events (for transition/animation cancel). The values for the keys are any CSS styles you want changed.** 

I’ve found this option useful in the past for changing values that can’t be animated or transitioned. For example, I’ve set this (using the end key with display: inline) on hero text in the past that I’ve animated (transformed in some way) to reset the ugly letter spacing display: inline-block introduces for some fonts. 

**When ECA wraps text (when the user sets the animate-chars class on a text element), it automatically sets each character’s display as inline-block** so the text can be transformed, which the user can’t do if the display is left as the default inline. But there’s a catch if you want to reset the display to inline on animation end. If you’re using the remove-animation-when-not-in-view option, make sure to set the element's display (without the animated class) as inline-block in your CSS as well else the display will stay as inline after the first animation completes. 

Warning! Be careful how you set and use listeners in your app. There are various performance considerations to keep in mind (doing any animation work, actually: see below). The above example, for instance (changing the display of elements) can easily cause cumulative layout shifts, if you’re not careful. 

### data-eca-char-delays: <a name="char-delays"></a>

Like the above option, this must be written in JSON format. Example:
```
data-eca-char-delays=' { "1": "200ms",
        "3": "400ms", "5": "300ms", "13": "2s", "20": "0ms", "21": "0ms", "22": "0ms", "23": "0ms", "70": "1s", "40": "900", "50": "0" } '
```
**Also, note that character counts start at one, not zero.** 

This option is mainly useful if you set a staggered delay but still want certain chars to be uniquely delayed with a different value. 

### data-eca-group-delay: <a name="group-delay"></a>

This acts like an animation delay for the whole group of elements. **This option is separate from any animation delay the user sets on elements individually, which sets the animation-delay (or transition-delay) property of the style attribute.** For example, you might set a group delay of 1s on a group of elements, and only after one second would their animation delays start (if you set any, else the animation starts). This also applies to any delays set using data-eca-delay on individual elements, so only after that 1s group delay expires will the third element of a group delay by 20ms (if you set such a delay on the third element of some group). 

Small implementation note, I used a setTimeout for this option, so technically this should be considered a minimum delay (that's also where the ridiculous max value of 25 days came from). In most cases though, as long as you carefully track what's going on in the main thread of your app (i.e., it's relatively free during your animation), it should act as expected.   

### trackingFn (tracking function): <a name="tracking-fn"></a>

Sometimes you may want to do something other than change a style on animation/transition beginning or end (or maybe you want tighter control over a style you’re changing, using a custom easing equation perhaps). The listen attribute is limited to only that (and changing styles on other animation events). So in order to help the user carry out custom animation tasks, ECA runs an optional function called trackingFn after the animated class is added to the elements.

For example, this is a bit contrived, but say the user wants to change the width of an element halfway through its CSS defined animation (and apply a new js run animation on top of the CSS one), apply a custom bounce easing equation (not possible with cubic bezier), and have the width continue to animate past the point of the element’s animation duration. We can use the trackingFn for that. First, the user would set the data-eca-duration attribute to more easily get the element’s animation duration. 

Then the user would have to grab the element or element group using the eca.animatable.getElementArray function, which takes the element group name and returns the array with properties, such as duration, attached to it--ECA keeps track of all animatable elements internally, and if you need one with the properties set on it, such as group delay or duration, then you’d use this function. 

The code might look like this (tracking an element group identified by class blocks):

```
   eca.ready(function trackBlocks() //fires on page load
    {
       var blocks = []; 
       
       blocks = eca.animatable.getElementArray("blocks"); //need to use this fn and not querySelectorAll since we need the instance of blocks that ECA has attached properties to
       
       /* 
          trackingFn fires after an animatable element has the animated class added to it.
          You don't have to use it to listen for animation events. You could, for example, 
          run a trackingFn even before the animation starts (during the delay) and have it 
          run a task (animation related or not) for an indefinite period of time. 
       
       */
       blocks.trackingFn = function(elems) //function attached to blocks elements must be called trackingFn
       {
           elems.forEach(function(elem)
           {
               elem.addEventListener("animationstart", trackingFnCb); //track animation start
           });
       };
       
       var trackingFnCb = function()
       {
            var finalWidth = 300; //300px; the new attribute we’re animating with js
            var currentWidth = parseInt(getComputedStyle(this).width, 10); 
            finalWidth = finalWidth - currentWidth; //how much we need to grow the width by
          
            setTimeout(function()
            {
                var startTime = window.performance.now(); 
                var duration = 1500; //duration of our new js animation, starting halfway through blocks main CSS defined animation 
               
                (function(elem)
                {
                   
                    requestAnimationFrame(function animateFrame(time)
                    {
                    
                       var timeFraction = (time - startTime) / duration;  //timefraction goes from 0 to 1 or 0 to 100%
                      
                       if(timeFraction > 1 )
                       {
                           timeFraction = 1; 
                       }
                      
                       var progress = easeOutBounce(time-startTime, duration); //apply custom easing to our animation progress
                      
                       var width = progress * finalWidth + currentWidth; 
                       elem.style.width = width + "px"; 
                      
                       if(timeFraction < 1 )
                       {
                           requestAnimationFrame(animateFrame); //continue animation in next frame
                       }
                      
                    });
                   
                })(this);
              
               
            }.bind(this), blocks.duration/2); //duration of blocks main animation is 2s and we want to start new animation halfway through
               
       };
       
       //easing equation by Robert Penner, modified for this example
       function easeOutBounce (t, d) 
       { 
    		if ((t/=d) < (1/2.75)) 
    		{
    			return (7.5625*t*t);
    		} 
    		else if (t < (2/2.75)) 
    		{
    			return (7.5625*(t-=(1.5/2.75))*t + .75);
    		} 
    		else if (t < (2.5/2.75)) 
    		{
    			return (7.5625*(t-=(2.25/2.75))*t + .9375);
    		} 
    		else 
    		{
    			return (7.5625*(t-=(2.625/2.75))*t + .984375);
    		}
	   }
       
     });
```
Note, the function must be called trackingFn, it must be attached as a property to the element group you want to track (e.g., blocks.trackingFn = ), and the element group must have come from the eca.animatable.getElementGroup function. 

**Also note how I’ve defined the callback fn to trackingFn separately and didn’t use an inline anonymous one. If you’re using the remove-animation-when-not-in-view option, you’ll want to define your event handlers separately,** otherwise when the animation is added again, you will accidentally bind multiple identical event listeners, which will all be called when the event listener fires. 

See the memory issues section here for other considerations to keep in mind: 

https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#memory_issues

As I mentioned, this example was a bit contrived. You could forgo CSS animations entirely and animate strictly in js, using ECA mainly for its scroll detection feature. You would still have to add the animate class in the html so ECA would know you want that element animated. To know when the animated class was added, you could define an empty CSS animation (with just a name and empty keyframes) or use a mutation observer to see if any elements have had the animated class added to it--and then run your JS animation from there. 
  
## Identical Element Group Names and Animation Order <a name="distinct-element-names"></a>

**ECA assumes text elements with the same identifiers (i.e., text elements who have the same first class name on their class lists) are distinct elements, each part of a different group** of elements. **With normal elements, an element is part of the same group no matter where it’s at in the html as long as it has the same class name first in its class list.** So, for example, these divs across different sections are all considered part of the same element group:

```
<section class=”section-1”>
	<h2 class=”section-title” data-eca-stagger=”20ms”>Section 1</h2>
<div class=”box animate” data-eca-stagger=”100ms”></div>
<div class=”box”></div>
</section>

<section class=”section-2”>
	<h2 class=”section-title” data-eca-stagger=”20ms”>Section 2</h2>
	<div class=”box”></div>
	<div class=”box”></div>
</section>
```

However, the section titles, although both having the same class name, are considered distinct elements. This may or may not make a difference in animation order depending on how the elements display on screen, and whether or not certain options are set.

In the case of the divs, if both sections are displayed horizontally such that a single scroll event reveals both at the same time, then the second section’s boxes will animate after the first’s. This is because we’ve set a staggered delay, hence the first box of section 2 will have a 300ms delay. 

If the sections are stacked vertically such that one scroll event only reveals the first section’s boxes, then the second sections boxes will start the delay sequence over again when revealed (the first box will have 100ms delay, the second 200ms), which essentially makes it act like its own distinct group. However, this behavior will change if the animate-all-on-first-sight option is set, making the animation behavior act like the boxes were always in a row even if vertical (e.g., the first box of section 2 will have 300ms delay). 

In the case of the text elements, whether stacked vertically or horizontally, each will always be treated as its own set of elements even if they have the same name. So the staggered delay of one will not carry over to the second. 

This behavior also affects the group-delay option. In the case of the boxes, there’s only one group delay shared among the elements, whereas with the titles each will have its own group delay (if the user sets one). In the case of the boxes stacked vertically such that the second section’s boxes appear after the first, the second section’s boxes will not have the group delay applied to them again when they’re finally revealed. Similarly, if you’ve scrolled to the first section and the group delay is still ongoing, the second section’s boxes’ animations won’t start until the group delay is finished (because group delay applies to the whole group of elements and the boxes are all technically one group). 

I made ECA behave this way because of how many sites organize their CSS. Many have distinct typography styles for section headers and the like, reused by section (but still distinct), whereas each sections’ elements are relatively more differentiated (so if we find the same classes inside a section it’s more likely to be part of a group, as in the row of cards example above). 

## Limitations <a name="limitations"></a>

By default, ECA fires on page load, and for now, this can’t be changed (see future updates below). Furthermore, ECA only works with elements that are there when the page loads, so elements added dynamically with createElement won’t be taken into account (again, see <a name="future-updates">future updates</a> below). 

Also, ECA changes styles dynamically by writing to the style attribute, so to use ECA you have to make sure your Content Security Policy allows for this. (In the future, if we could set animation delays dynamically using CSS counter values with calc, there’d be no need to use inline styles, but until then, it’s the most flexible way to do this.) 

## Future Updates <a name="future-updates"></a>

This is the first version of ECA. I could have done more with it, but I decided to make version 1.0 with the fundamentals I wanted solidified. That leaves room for future updates.

A small list of proposed changes/additions in future versions is as follows:

1. On the code side, I’m rewriting everything in es6 using newer apis, like intersection observer for performance improvements (I wrote ECA 1.0 in strictly es5 for widest possible browser support). 

2. Support for animating dynamically added elements after page load.

3. Custom Stagger Delays based on other functions besides linear, which is essentially how data-eca-stagger works now (e.g., data-eca-stagger=”20” models delays based on the function y=20x). This will mean support for delays based on exponential, logs, power, and periodic functions. 

4. Offset fixes. The behavior I described for offset might be fixable, given I can implement a performant solution (to be looked into).

5. Better support for running custom code. The trackingFn is a bit vague as of now, and to use it to track different parts of the animation (start, end), you might end up writing identical looking code in a few places. Code like that will be abstracted away in future versions. I also plan to add support for changing how (e.g., give the users an easy way to use event delegation vs adding event listeners per element) and when (e.g., on page load, vs immediately after the animated class is added) the function is run.

## Make Your Animations Meaningful <a name="give-animations-meaning"></a>

Make sure your animations have a purpose beyond “looking cool.” It’s tempting to just put a bunch of animations on screen because they look good, but unless they’re carefully planned they could just end up overwhelming and confusing the user. Just like how designs act, animations could make your site seem less serious or more sophisticated (think bouncing pixar letters vs a slow fade-in). In fact, they should go hand-in-hand with the design to accomplish a purpose.

Whatever that purpose is the animations should capture a user’s attention and direct their focus. For example, in an app setting, you might choose to use action based animations versus simpler state based animations to suggest that a user’s input either accomplished a certain action (e.g., sending off a contact form email) or caused it to fail (form input invalidated). 

Whatever the use case, be sure to always keep performance in mind and try to stick to animating composite properties like opacity and transform (i.e., translate, rotation, scale, skew).

Happy animating!
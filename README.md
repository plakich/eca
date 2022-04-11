# ECA

*Easier/Enhanced CSS3 Animations (ECA)*

ECA is a library that extends the functionality of CSS3 animations. With ECA, you can animate elements on scroll, animate text with ease, easily set event listeners for pre/post animation, reverse 
animation order, modify non animatable properties (e.g., display, position), create animation groups, and add staggered delays to elements—all without you writing a single line of JavaScript. 

## Table of Contents
* [Why make this project](#why-make-this-project)
* [Installation](#installation)
* [Basic Use](#basic-use)
   - [Caveats When Animating Text with Existing HTML Tags Inside](#animate-text-caveats)
   - [Avoiding FOUT When Using animate-chars](#fout)
* [Advanced Use](#advanced-use)
   - [Advanced Use Examples and Further Explanation](#advanced-use-ex)
      - [data-eca-offset](#offset)
      - [data-eca-remove-animation-when-not-in-view](#reset-animation-state)
      - [data-eca-animate-all-on-first-sight vs default app behavior](#animate-all-vs-default)
      - [data-eca-listen](#listen)
      - [data-eca-char-delays](#char-delays)
      - [data-eca-group-delay](#group-delay)
      - [tracking function, for adding custom JS animations](#tracking-fn)
* [Animations with Transforms and Sudden Page Jumping](#page-jumping)
* [Identical Element Group Names and Letter Group Names](#distinct-element-names)
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

For ECA, I wanted to make a library that was extremely simple to use, so easy that all you had to do was add a class or two to your HTML and CSS without changing the animations you already wrote; a library that was more flexible than other animation libraries, so you could use animations, transitions, or both in your app, switching it up as needed; a library that offered more animation options and possibilities than allowed by other CSS animation libraries, and a library that acted how we wanted it to without writing any JavaScript—all which ECA does.

Saving the user from having to write JavaScript was a major goal for ECA, since if we look at JS animation engines, where it's all JavaScript, we can see they are much more flexible and feature rich (though you might have to pay extra for those features) but usually involve writing code 
of the following form: 

1. select elements to animate/extend functionality of from the DOM

```
const element1 = document.querySelectorAll('.some-element-class');
setupElementForAnimation(element1) // maybe get coordinates on page or add some initial properties to element
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

Download the zip file <a href="https://github.com/plakich/eca/archive/refs/heads/main.zip">here</a>, extract eca.js from the zip, place eca.js in the appropriate directory based on your project structure, and place a script tag before the closing body tag (or use defer) in your HTML like so

`<script type="text/javascript" src="eca.js"></script>`

## Basic Use <a name="basic-use"></a>

While the library offers a ton of custom options to make more out of CSS3 animations, at its simplest,
to animate elements on scroll, you simply 

1. add the eca-animate (present tense) class in your HTML to the first element of some group you want animated,
making sure each element of the group uses the same class name first in its list of classes (e.g., each starts with class="card ...etc")

2. set an optional delay to be staggered (e.g., data-eca-stagger="100") based on multiples of the delay set (so you don't have to set it on each element)

3. define the eca-animated (past tense) class in your CSS on the elements' class with the accompanied animation you want to use.

The library does the rest of the work for you. You don't have to write a single line of JavaScript. (You don't have to write the animations yourself either. If you want, 
you could just as easily use a library like <a href="https://animate.style/">animate.css</a>, which has a bunch of predefined animations ready for use.)

For example, in HTML you might write (making sure this is the first element in a group of like elements, if it's part of a group)
```
<div class="box eca-animate" data-eca-stagger="100ms" > // this delay is staggered so the next element would get a 200ms animation-delay by default (or the first can be zero and next 100, see advanced use below)
<div class="box"></div>
<div class="box"></div>
...
```
and in the CSS you might write, assuming you've defined an animation called fade-in somewhere:

```
.box.eca-animated {
     animation: fade-in 1s ease-out forwards;
} // animated, past tense
```
And now your box elements will all show up on scroll, with the appropriate delays set (if you don't want staggered delays set, don't set them, 
or if you want to use the same delay for all elements, just set it how you normally would via CSS animation-delay property). 

Another big animation feature of ECA is animating text characters. ECA will wrap the text for you (in spans, for letters, and
divs, for words) so you don't have to manually do it yourself, all the while respecting any other tags you may have in your text, like anchors or other spans. So you can do this, for example.

`<h1 class="hero__hero-text eca-animate-chars">Our Very Long Hero Text!</h1>`

Adding the eca-animate-chars class to any text will transform it, after the page loads, like so: 
```
<h1 class="hero__hero-text eca-animate-chars" data-eca-stagger="25ms" aria-label="Our Long Hero Text!">
	<div class="word" aria-hidden="true">
		<span class="letter">O</span><span class="letter">u</span><span class="letter">r</span>
	</div> 
                ...etc
</h1>
```
Then you might add an animation in CSS like so:
```
.hero__hero-text .letter.eca-animated {
	animation: bounce 1s ease-in forwards; 
}
```
And don't worry: ECA keeps accessibility in mind too, so screen readers will read text as a whole, without enunciating each character individually (that's what the aria-label is there for). 

By the way, you're not limited to a single animation per element. The library doesn't change the way CSS works: it just helps it do more. So you could still, for instance, 
use the nth-of-type selector to have one set of elements play with one animation and another set play a different one, resulting in a completely new animation. 

## Caveats When Animating Text with Existing HTML Tags Inside <a name="animate-text-caveats"></a>

While ECA takes care to respect existing HTML tags when wrapping text for animation, it's not perfect, and there are some caveats to be aware of. This is best illustrated with examples.

```
<h2 class="okay-to-wrap eca-animate-chars" aria-label="This TEXT will wrap fine.">
	<a href="/link">This <em>T</em>EXT<br> will wrap fine.</a>
</h1>

<h2 class="wrapping-error eca-animate-chars" aria-label="This TEXT will NOT wrap fine.">
	This <span class="highlight-red">T</span><span class="highlight-red">E</span>XT will NOT wrap fine.
</h1>

```
As in the first h2 above, if we have tags surrounding our text, the wrapping will be fine: the resulting HTML ECA generated will be valid. It will even be okay if we have tags already around individual letters, so long as those tags have no attributes, like the em in the first h2. 

However, ECA will NOT produce valid HTML (or text even, since ECA will wrap part of the tag too) after wrapping the second h2's text. This is because the span contains attributes, and ECA has trouble handling those when they surround single letters.  

I made no attempt with ECA to actually parse HTML. The method I use is quick, but error prone if the HTML is too complex. If you need to target specific letters of the text as in the second example, it's best to use the spans ECA generates. To color the two first two letters of 'text' red, for instance, the user could use the nth-child selector targeting the spans inside the word divs ECA adds. 

If you're in doubt about ECA's ability to wrap some text with existing HTML, try it, but make sure to inspect the page to see if it was correctly wrapped. 

## Avoiding FOUT When Using eca-animate-chars <a name="fout"></a>

Since text is wrapped dynamically, it may introduce Flashes Of Unstyled Text (FOUT) when you have your animation set on the letter class. The easiest way to get rid of this is to make the initial state of the letter class animation the same on the parent container (the one containing the divs and spans). 

For example, assume the following hero text "Hero" has been wrapped as follows: 

```
<h1 class="hero eca-animate-chars" aria-label="Hero">
	<div class="word">
		<span class="letter">H</span>
		<span class="letter">e</span>
		<span class="letter">r</span>
		<span class="letter">o</span>
	</div>
</h1>
```

Assuming we'd want to animate the opacity of each letter from 0 to 1, we'd do this for the parent container to avoid any FOUT:

```
.hero {
	/* Obviously we might have 
	some styles here before opacity
	but they're left out in this example*/
	
	opacity: 0;
}

.hero[aria-label] { /* aria-label is added after ECA executes */
	opacity: 1;
}

.hero .letter { 

/* once the text is wrapped and aria-label
is added to the parent, we'd have to set
the parent's opacity back to 1, as
we did above, if we want to
ever see the letter animation*/

	opacity: 0;
}

.hero .letter.eca-animated { /*simple animation from 0 to 1 opacity */
	animation: fade-in 1s ease-in forwards;
}

```

## Advanced Use <a name="advanced-use"></a>

There are quite a few options that ECA uses to help you tweak and refine your animations to fit your use case. I made the names longer to be more descriptive, so a user could potentially infer what they do without referring to the documentation. 

Many of the below options can either be set as a global option, on the HTML
element of your page, or overridden on a per element basis. Others are simply global options or element options. **Note, none of these options are required.** 

**By default, ECA assumes the following are true:**

* the user is using animations, not transitions, for animations (i.e., ECA sets the animation-delay property when the user specifies a staggered delay)
* staggered delays should start at the number specified, not zero (e.g., data-eca-stagger="100" will set the first element's delay as 100ms, the next as 200, not 0 for the first and 100 for the second)
* when scrolling down, elements should animate when their top reaches (past) the viewport bottom (no offset by default)
* animations should only play once (e.g., if the user scrolls back up above the element, the element's animation will not reset and then play again when it comes back into view). 

The full list of options is below. Options that can be set globally (applying to every element group) and per element group are marked with a 'g' and an 'e' (g/e). Per element group options are marked with just an 'e' (e) and global with just a 'g' (g). Options marked with an asterisk (*) can be set on each element of a group. (All options below with a ms value, e.g., 100ms, can also take a value in seconds, e.g., 2s, or a unitless value and ECA will assume it's in ms.)
**All the options are set, each as an attribute on an element, by prefixing them with data-eca (e.g., data-eca-offset="200").**


| Option        | Description   | Example Value | Default Value | Max Value                                                     |
| ------------- |---------------|---------------|---------------|---------------------------------------------------------------|
| offset (g/e)  | Pixel offset from an element's top when it should be considered in view and animatable |   100       |       0        | Element's Height
| remove-animation-when-not-in-view (g)     | When the element is scrolled out of view (e.g., element is below viewport), then the animation will be removed from the element giving it a chance to animate again when it comes back into view. Set option to 'below' to only remove the animation when the element is below the viewport, or for vice versa use 'above.' Set to 'true' to use behavior from both 'above' and 'below.'      |   true         |      false       |                                                               |         
| stagger-from-zero (g/e) | Start staggered delay from zero (e.g., data-eca-stagger="100" the first element will have no delay, the second 100, and so on.)      |    true         |     false          |                                                               |
| play-on-load (g/e)             | Animations will play on load, not on scroll. This is the default CSS behavior, of course. You might set this if you just want to only use the delay feature of the library.              |     true          |       false        |                                                               |
| animate-all-on-first-sight (g/e)              | When one element of a group comes into view, all of the rest will also be animated, regardless of whether they're visible or not              |    true           |      false         |                                                               |  
| animate-with-transitions (g/e)              | Affects delays and listeners set (e.g., if set to true, delays will be transition delays and listeners set with end will be transitionend).              |   true            |   false            |                                                               |
| stagger (g/e)              | Stagger a group's animation delays by some multiplier. (e.g., data-eca-stagger="100" the first element will have 100ms delay, the second 200, and so on)              |     100ms          |     none          | Approx safe-max-int/group.length                                                              |
| listen (e)              | Set event listeners (in JSON format) on animation/transition start, end, iteration, cancel, run to change styles.               | data-eca-listen=' { "end": "display: inline" } '              |  none             |                                                               | 
| listen-once (e)              | Event listeners should fire only once and then be removed. Can be used as a performance optimization if remove-animation-when-not-in-view is false.            | true              | false              |                                                               |
| group-delay (e)              | A delay before any element of a group animates (see below for details)              | 1000ms               | 0              |                                                             |  
| reverse (e)              | Reverse order of animation (e.g., first element will now animate last and last will animate first)               | true               | false              |                                                               |    
| duration (e)              | Animation or transition duration. Not used by ECA but useful to set if you use a custom tracking function (see below for details)               | 2s              | none               |                                                               | 
| char-delays (e)              | Specify unique delays (in JSON format) for each text character of a text element              | data-eca-char-delays=' { "1": "200", “3”: “2s” } '              | none              |                                                               |
|throttle-resize (g) | Throttle for resize event | 100ms | 0 | |
|throttle-scroll (g) | Throttle for scroll event | 100ms | 0 | |
| delay (*)              | Specify a unique animation delay for some element in a group               | 100ms              | none              |                                                               |

## Examples of Advanced Option Use and Further Explanation <a name="advanced-use-ex"></a>

**Global options are set on the HTML element.** 

`<html lang=”en” data-eca-remove-animation-when-not-in-view=”true” data-eca-stagger-from-zero=”true” data-eca-animate-with-transitions=”true”>`

You can override global options on a per-element-group basis, as we do below for the animate-with-transitions option (**element group options always override ones set globally**). When setting options for an element group you set the option on the first element of said group and they’ll apply to the group as a whole (e.g., all elements in the group will use a 200px offset). 
```
<div class=”box eca-animate” data-eca-offset=”200” data-eca-stagger=”100ms” 
data-eca-reverse=”true” data-eca-animate-with-transitions=”false” data-eca-stagger-from-zero=”false” ></div>
<div class=”box”></div>
<div class=”box”></div>
```
**The only option that can be set per element (not just element group) is the delay option**, which can be set like so. 
```
<div class=”box animate” data-eca-offset=”200” data-eca-stagger=”100ms” data-eca-reverse=”true” 
data-eca-animate-with-transitions=”false” data-eca-stagger-from-zero=”false” ></div> // these are options for whole element group
<div class=”box”></div>
<div class=”box” data-eca-delay=”2s”></div> // delay option is set per element, so the third element will have an animation-delay of 2s instead of 300ms
```
Some important notes about a few of the advanced options:

### data-eca-offset: <a name="offset"></a>

You can set any number you want for this, but ECA forces the max to always be the element's height. This is because ECA allows elements to scroll into view both ways,
from above and below the viewport. The same type of scroll behavior we see on the bottom half of the screen will be reflected on the top half. 

For example, suppose we have an element 500px in height, a 500px offset, and a viewport 1000px in height. If the user is scrolling down to the element, the element will only be considered visible when its bottom reaches the bottom of the viewport. Vice versa if the user is scrolling up to the element. And it can only "travel" 500px before it disappears, in either direction from when it appears. 

If we keep pushing the offset past the element's height, such that its bottom keeps appearing farther and farther above the viewport, it'll eventually reach a point where its center is in the center of the screen. And it'll only be visible at that single point, should the user somehow happen to scroll perfectly there, and disappear immediately once the screen moves even a single pixel past that point. For the 500px height element, that max offset would be at 750px (half the screen's height plus half the element's height). And if the user added even a single pixel more to that max offset, the element would never be visible. 

To prevent strange cases like the above example, **ECA makes each element’s height the max offset.** 

**ECA also does this to prevent edge cases where elements are flush with the top or bottom edges of the document.** If an element is flush with the bottom of the document, for instance, it can’t be offset by any more than its height, because the screen isn’t scrollable past that amount.

Finally, when removing animations, the behavior of offset is affected by whether or not you're using transitions or animations. See below.


### data-eca-remove-animation-when-not-in-view: <a name="reset-animation-state"></a>

When set to true, this option removes the eca-animated class from an element when it’s no longer visible on screen, either above or below the viewport. The main use of this option is that it gives the element a chance to play its animation when it becomes visible again. **Note, this option applies to both transitions and animations alike.**

However, if the animate-with-transitions option is true the transition will reverse when it’s no longer considered visible—that visibility being affected by offset if it's set. If animate-with-transitions option is not set (or if false), ECA will assume the user is using animations for animations, not transitions, which means only when the element goes completely out of view will the eca-animated class be removed, despite if offset is set or not (because there’s no logical way to reverse complex animations, especially those involving transforms, so we want to make sure their disappearing is hidden from the user). That is, **offset will only affect when animations appear, not when they disappear (unlike with transitions where it affects both).** 

Note, **if this option is set with either 'above' or 'below' it only removes the animation that one way, when the element is scrolled out of view either above or below the viewport.** 

I made ECA this way because of how most people define animations. A common animation to see on many pages is where an element fades into view, rising from below. If the animation was also removed when scrolling down the page (i.e., when the element is above the viewport) the element risks entering a cycle where the animation class is removed, immediately added again (because the user is still scrolling), and then removed again. For this reason, you might only want to set this option to 'below.' Vice versa if you want to switch directions and have the user start at the bottom of the page and scroll up. On the other hand, if the user defines animations carefully, this option can be set to true without any hassle or strange behavior when scrolling in either direction.

### data-eca-animate-all-on-first-sight vs default app behavior: <a name="animate-all-vs-default"></a>

**This option changes the default behavior of the app so that when one element of a group becomes visible, the rest are considered visible as well—and hence they animate right away, even if the rest aren’t visible.**

By default the app considers elements’ visibility individually. For example, assume a user has two rows of cards, three each row, stretching across the screen (no matter the screen width) with a large gap between rows, and has set a staggered delay of 100ms. When the first row becomes visible, the delays will be 100ms, 200ms, 300ms. But what about the second row? That depends upon the scroll behavior. 

If the user scrolled fast enough such that the second row became visible roughly with the first (a single scroll event revealed enough screen real estate), then the second row’s delays would be 400ms, 500ms, 600ms. Otherwise, the delays would be the same as the first row (100, 200, 300).

This scroll behavior of the app captures how I think most people perceive group animations. If part of a group is visible at the same time and we want the delays to stagger, then we’d want the first scenario to play out. Else, if the second row is revealed like it has its own group of elements, it should delay like its own group, as in the second scenario. (In reality though, it's still part of the same group, meaning the options you set on the group apply to those sub elements too.) 

Now imagine those cards but they're all stacked vertically. If we didn't implement the above behavior, by the time the user scrolled the tenth one into view they'd be waiting a whole second before the animation started—plus the time they waited scrolling to it. But by then the link between what is being animated and what was animated might be obscured (out of sight, out of mind). 

Still, the user may want to change this behavior and always animate a group of elements as a whole (usually elements that stretch to different rows as in the cards example but are usually so close together that even if a single scroll event doesn't animate the whole group, the next one will, leading to them animating in tandem almost), which is what the animate-all-on-first-sight option does, respecting any delays set (so a staggered delay will apply to all elements, in every row, regardless of visibility, as long as the first element is visible). 

**In the past, I’ve mostly used this for the header text of sections**—which may be large enough, font size wise, and long enough, character wise, to stretch to two rows with some noticeable gap between the rows—when I didn’t want “breaks” in the animation, which could happen if the user didn’t scroll quite enough to reveal the whole title. 

Setting this option ensures the title will always animate as a whole. ( Note, this option can be used with any element group, not just text). 

Finally, **if the user has set the remove-animation-when-not-in-view option to true along with this option, only when the first or last element goes out of view will the entire group have all its animations removed.** That is, since all elements animate as a whole, they will reset as a whole as well. 

### data-eca-listen: <a name="listen"></a>

This is used to change styles of an element when animation events fire. This option has to be written in JSON format. The format for that is one single quote ‘ followed by a left bracket { followed by keys in double quotes with a colon following the key, like so “a”: followed by values in double quotes “1”. If you want multiple values, there must be commas between the values. An example listen object is written like so:
```
data-eca-listen=’ { “start”: “position: absolute; background: red”, “end”: “position: fixed; background: grey” }’ 
```
Note the above semicolon between the styles in double quotes. If you happen to mess up writing the listen attribute, open the console and an error will display letting you know which element needs fixing. 

The above listener sets an event listener for animation start and end events, with the following styles changed on each event. **Note, if animate-with-transitions option is set on said element group or globally, then the keys start and end will set a listener for transition start and end respectively, instead of animation start and end.** 

**The values the listener takes, as keys, are run (short for transitionrun event), start, end (for animation/transition start and end events), iteration (for animationiteration), and cancel events (for transition/animation cancel). The values for the keys are any CSS styles you want changed.** 

I’ve found this option useful in the past for changing values that can’t be animated or transitioned. For example, I’ve set this (using the end key with display: inline) on hero text in the past that I’ve animated (transformed in some way) to reset the ugly letter spacing display: inline-block introduces for some fonts. 

**When ECA wraps text (when the user sets the eca-animate-chars class on a text element), it automatically sets each character’s display as inline-block** so the text can be transformed, which the user can’t do if the display is left as the default inline. But there’s a catch if you want to reset the display to inline on animation end. If you’re using the remove-animation-when-not-in-view option, make sure to set the element's display (without the eca-animated class) as inline-block in your CSS as well else the display will stay as inline after the first animation completes. 

Warning! Be careful how you set and use listeners in your app. There are various performance considerations to keep in mind (doing any animation work, actually: see below). The above example, for instance (changing the display of elements) can easily cause a burst of layout shifts, if you’re not careful. 

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

Small implementation note, I used a setTimeout for this option, so technically this should be considered a minimum delay. In most cases though, as long as you carefully track what's going on in the main thread of your app (i.e., it's relatively free during your animation), it should act as expected.   

### trackingFn (for adding custom JS animations): <a name="tracking-fn"></a>

Sometimes you may want to do something other than change a style on animation/transition beginning or end (or maybe you want tighter control over a style you’re changing, using a custom easing equation perhaps). The listen attribute is limited to only that (and changing styles on other animation events). So in order to help the user carry out custom animation tasks, ECA runs an optional function called trackingFn after the eca-animated class is added to elements.

For example, this is a bit contrived, but say the user wants to change the width of an element halfway through its CSS defined animation (and apply a new JS run animation on top of the CSS one), apply a custom bounce easing equation (not possible with cubic bezier), and have the width continue to animate past the point of the element’s animation duration. We can use the trackingFn for that. First, the user would set the data-eca-duration attribute to more easily get the element’s animation duration. 

Then the user would have to grab the element or element group using the eca.animatable.getElementArray function, which takes the element group name and returns the array with properties, such as duration, attached to it—ECA keeps track of all animatable elements internally, and if you need one with the properties set on it, such as group delay or duration, then you’d use this function. 

The code might look like this (tracking an element group identified by class blocks):

```
    eca.ready(function trackBlocks() // fires on dcl 
    {       
       const blocks = eca.animatable.getElementArray("blocks"); // need to use this fn and not querySelectorAll since we need the instance of blocks that ECA has attached properties to
       
       /* 
          trackingFn fires after an animatable element has the eca-animated class added to it.
          You don't have to use it to listen for animation events. You could, for example, 
          run a trackingFn even before the animation starts (during the delay) and have it 
          run a task (animation related or not) for an indefinite period of time. 
       
       */
       blocks.trackingFn = elems => // function attached to blocks elements must be called trackingFn
       {
           elems.forEach(elem =>
           {
               elem.addEventListener("animationstart", trackingFnCb); // track animation start
           });
       };
       
       const trackingFnCb = function()
       {
       	    const elem = this; 
	 
            let finalWidth = 300; // 300px; the new attribute we’re animating with JS
            const currentWidth = parseInt( getComputedStyle(elem).width, 10 ); 
            finalWidth = finalWidth - currentWidth; // how much we need to grow the width by
            
	    // we could also just call rAF immediately here and keep recursively calling it
	    // until we reach duration/2, instead of using setTimeout
            setTimeout(() => 
            {
                const startTime = window.performance.now(); 
                const duration = 1500; // duration of our new JS animation, starting halfway through blocks main CSS defined animation 
                   
		requestAnimationFrame(function animateFrame(time)
		{
		    let timeFraction = (time - startTime) / duration;  // timefraction goes from 0 to 1 or 0 to 100%

		    if ( timeFraction > 1 )
		    {
		        timeFraction = 1; 
		    }

		    const progress = easeOutBounce(time-startTime, duration); // apply custom easing to our animation progress

		    const width = progress * finalWidth + currentWidth; 
		    elem.style.width = width + "px"; 

		    if ( timeFraction < 1 )
		    {
		        requestAnimationFrame(animateFrame); // continue animation in next frame
		    }

		});
               
            }, blocks.duration/2); // duration of blocks main animation is 2s and we want to start new animation halfway through    
       };
       
       // easing equation by Robert Penner, modified for this example
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

**Also note how I’ve defined the callback fn to trackingFn separately and didn’t use an inline anonymous one. If you’re using the remove-animation-when-not-in-view option, you’ll want to define your event handlers separately,** otherwise when the animation is added again, you will accidentally bind multiple event listeners, which might appear to be identical, but which will all be called when the event listener fires (they're anonymous, so it's really a new function on each iteration). When you define your named handlers separately, you will not only be able to remove them later, but they also won't be added twice, since the listener is actually identical. 

See the memory issues section here for other considerations to keep in mind: 

https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#memory_issues

As I mentioned, this example was a bit contrived. You could forgo CSS animations entirely and animate strictly in JS, using ECA mainly for its scroll detection feature. You would still have to add the eca-animate class in the html so ECA would know you want that element animated. And if you needed more precision to know when the eca-animated class was added, you could use a mutation observer to see when any elements have had the eca-animated class added to it—and then run your JS animation from there. 

## Animations with Transforms and Sudden Page Jumping <a name="page-jumping"></a>

For whatever reason, animating with transforms on some browser/hardware combinations can cause page jumping to the left or right when reloading the page or on orientation change. For example, say you have an element off screen (translated to the right with translateX) that you want to translate back to 0. According to the <a href="https://www.w3.org/TR/css-transforms-1/#transform-rendering">spec</a>, transforms shouldn't affect layout but they do affect overflow. However, the translated element could cause the whole page to expand, even if you specify overflow-x: hidden on the body, as if the layout of the entire document (the width) was changed by the translated amount. 
	
A simple fix for this might be as follows:

```
// also set overflow-x: hidden on the body

window.addEventListener("load", function()
{
	setTimeout(function()
        {
            
            const html = document.querySelector('html'); 
            // We need all three below because certain browsers will only work with a certain one in exclusion of the rest 
            // (e.g., for ie only document.body works; the rest are ignored);
            html.scrollLeft = 0; 
            document.documentElement.scrollLeft = 0; 
            document.body.scrollLeft = 0; 
            
            
        }, 100); // need to wrap in setTimeout because page will jump (not all browsers but some) fraction of sec after load and after scrollLeft set to 0; 
        // 100ms above is a bit arbitrary since page could jump more than a 100ms after load, but for most browsers/different loads tested this works fine
});

```
  
## Identical Element Group Names and Letter Group Names <a name="distinct-element-names"></a>

**ECA assumes elements with the same identifier (i.e., elements who have the same first class name on their class lists) are all part of the same group of elements, but only when they have the same parent container**. So, for example, these divs (with class box) and section titles (with class section-title) across different sections are each considered part of their own element group:

```
<section class=”section-1”>
	<h2 class=”section-title eca-animate-chars” data-eca-stagger=”20ms”>Section 1</h2>
	<div class=”box eca-animate” data-eca-stagger=”100ms”></div>
	<div class=”box”></div>
	<div class="box"></div>
	<div class="box"></div>
</section>

<section class=”section-2”>
	<h2 class=”section-title eca-animate-chars” data-eca-stagger=”20ms”>Section 2</h2>
	<div class=”box eca-animate” data-eca-stagger="100ms"></div>
	<div class=”box”></div>
	<div class="box"></div>
	<div class="box"></div>
</section>
```

However, if we removed the second section, kept its children, and removed the eca-animate class from the second box group, the boxes would then all be part of the same group of elements. But each h2 would still be considered its own group (assuming we kept the eca-animate-chars class, else the second h2 wouldn't be a group at all). This is because ECA generates the HTML for text animations dynamically. 

The group distinction is an important one to keep in mind when using either the group-delay option or the animate-all-on-first-sight option, since they both act on groups, not elements within the group. 

Also **note the id of the group that ECA uses to track groups will be different every time a group with an identical name is added.** So, looking at the above HTML, that second box group would have group id 'box4,' if we assume we're only animating four groups of elements. That is, a unique number will be tagged on to the end of the group name based on its position within the HTML and how many ECA groups came before it. 

Furthermore, when writing custom code keep in mind that **querying for element groups ECA tracks should be made with eca.animatable.getElementArray(groupId). When querying for letter groups, like the above h2s, you would tack on -letters to the end of the group name.** For example, we'd call eca.animatable.getElementArray("section-title-letters3") using '3' if we wanted the second letter group (or use just 'section-title-letters' to get the first group, without a number at the end).  

## Limitations <a name="limitations"></a>

By default, ECA fires on DCL, and for now, this can’t be changed (see future updates below). Furthermore, ECA only works with elements that are there when the document is parsed, so elements added dynamically with createElement won’t be taken into account (again, see <a name="future-updates">future updates</a> below). 

Also, ECA changes styles dynamically by writing to the style attribute, so to use ECA you have to make sure your Content Security Policy allows for this. (In the future, if we could set animation delays dynamically using CSS counter values with calc, there’d be no need to use inline styles, but until then, it’s the most flexible way to do this.) 

## Future Updates <a name="future-updates"></a>

This is the first version of ECA. I could have done more with it, but I decided to make version 1.0 with the fundamentals I wanted solidified. That leaves room for future updates.

A small list of proposed changes/additions in future versions is as follows:

1. On the code side, I’m rewriting certain features using newer apis, like intersection observer for performance improvements. From the user's perspective, this shouldn't break backward compatibility with older versions of the app.   

2. Support for animating dynamically added elements after page load.

3. Custom stagger delays based on other functions besides linear, which is essentially how data-eca-stagger works now (e.g., data-eca-stagger=”20” models delays based on the function y=20x). This will mean support for staggered delays with custom easing. 

4. Offset fixes. The behavior I described for offset might be fixable, given I can implement a performant solution (to be looked into).

5. Better support for running custom code. The trackingFn is a bit vague as of now, and to use it to track different parts of the animation (start, end), you might end up writing identical looking code in a few places. Code like that will be abstracted away in future versions. I also plan to add support for changing how (e.g., give the users an easy way to use event delegation vs adding event listeners per element) and when (e.g., on page load, vs immediately after the eca-animated class is added) the function is run.

6. Better group-delay timer precision. As mentioned above, you really shouldn't run into any problems with group-delay unless you're really bogging down the main thread. However, sometimes it's doing nothing that can cause problems. On many browsers, for instance, switching tabs automatically changes when timers fire. If your inactive tab was using a group delay, you may see a larger delay than you planned for. In future updates, delays will be calculated on their own thread via a dedicated worker, so this won't be a problem anymore.

## Make Your Animations Meaningful <a name="give-animations-meaning"></a>

Make sure your animations have a purpose beyond “looking cool.” It’s tempting to just put a bunch of animations on screen because they look good, but unless they’re carefully planned they could just end up overwhelming and confusing the user. Just like how designs act, animations could make your site seem less serious or more sophisticated (think bouncing pixar letters vs a slow fade-in). In fact, they should go hand-in-hand with the design to accomplish a purpose.

Whatever that purpose is, the animations should capture a user’s attention and direct their focus. For example, in an app setting, you might choose to use action based animations versus simpler state based animations to suggest that a user’s input either accomplished a certain action (e.g., sending off a contact form email) or caused it to fail (form input invalidated). 

Whatever the use case, be sure to always keep performance in mind and try to stick to animating composite properties like opacity and transform (i.e., translate, rotation, scale, skew).

Happy animating!
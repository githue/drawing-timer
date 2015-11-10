/* global Hammer */
/* global $ */
var reader;
var touchContainer;

var playlist = {
	create: function (files) {
		// start at -1 because it will increment to 0 to get first image.
		this.pos = -1;
		this.array = [];
		playHistory.array = [];
		playHistory.pos = 0;
		// Transfer FileList to our own array for sorting.
		for (var i = 0; i < files.length; i++) {
			// Add a File blob to the playlist.
			this.array.push(files[i]);
		}
		files = null;
		shuffle(this.array);
		slideshowReady();
	},
	next: function () {
		var img = this.array[playlist.pos];
		if (playlist.pos >= this.array.length) {
			// The end.
			return;
		}
		// Change to a new image.
		change(img);
		
		// Update the playlist history.
		playHistory.array.push(img);
		playHistory.pos = playHistory.array.length - 1;
	}
};
var playHistory = {
	back: function () {
		if (this.pos < 1) return;
		change(this.array[--this.pos]);
	},
	forward: function () {
		if (this.pos >= this.array.length - 1) return;
		change(this.array[++this.pos]);
	}
};
var findNextImage = function () {
	// In history if current position in history is not the same as the
	// length of the history array.
	var inHistory = !(playHistory.array.length - 1 === playHistory.pos || playHistory.array.length < 1);
	if (inHistory) {
		playHistory.forward();
	} else {
		playlist.next(playlist.pos++);
	}
};
var change = function (img) {
	// begin fading out.
	hideElements($('#slideshow')[0], 'fast');
	
	// Show next image after 500ms.
	setTimeout(function () {
		$('#time-limit').countdown('destroy');
		countdownRestart();
		reader.readAsDataURL(img);
		showElements($('#slideshow')[0], 'fast');
	}, 500);
};
var handleFiles = function (e) {
	var files = e.target.files;
	if (files.length < 1) return;
	
	playlist.create(files);
};
// Show the start button.
var slideshowReady = function (e) {
	document.querySelector('#status').classList.add('hidden');
	document.querySelector('#start').removeAttribute('hidden');
};
var slideshowNext = function (e) {
	findNextImage();
};
var slideshowBack = function (e) {
	playHistory.back();
};
var slideshowPause = function (e) {
	$('#time-limit').countdown('pause');
	document.body.classList.add('countdown-paused');
};
var slideshowResume = function () {
	$('#time-limit').countdown('resume');
	document.body.classList.remove('countdown-paused');
};
var slideshowPauseToggle = function () {
	if (document.body.classList.contains('countdown-paused')) {
		slideshowResume();
	} else {
		slideshowPause();
	}
};
var countdownAdd = function (speed) {
	$('#time-limit').countdown({
		until: +speed,
		format: 'MS',
		compact: true,
		onExpiry: function () {
			findNextImage();
		}
	});
}
var countdownRestart = function () {
	if (!document.body.classList.contains('slideshow-started')) return;
	$('#time-limit').countdown('destroy');
	countdownAdd(getSpeed());
	slideshowResume();
};
var getSpeed = function () {
	return $('#speed option:selected').val();
};
var initializeSlideshow = function (e) {
	var img = document.querySelector('#slideshow img') || new Image();
	
	reader = new FileReader();
	reader.onload = (function (aImg) {
		return function (e) {
			aImg.src = e.target.result;
		};
	})(img);
	
	document.querySelector('#slideshow').appendChild(img);
	
	document.querySelector('#previous').removeAttribute('hidden');
	document.querySelector('#pause').removeAttribute('hidden');
	document.querySelector('#next').removeAttribute('hidden');
	
	document.body.classList.add('slideshow-started');
	
	findNextImage();
}
/**
	* Hide transition.
	* @param {object} element - The node to apply the transition to.
	* @param {string} speed - Keyword describing the transition speed.
	*/
var hideElements = function (elements, speed) {
	if (!elements.length) elements = [elements];
	if (!speed) speed = 'none';
	for (var i = 0; i < elements.length; i++) {
		// TODO: search for attached transition-speed instead of blindly
		// removing them all.
		elements[i].classList.remove('show', 'transition-fast', 'transition-slow', 'transition-none');
		elements[i].classList.add('hide', 'transition-' + speed);
	}
};
/**
* Show transition.
* @param {object} element - The node to apply the transition to.
* @param {string} speed - Keyword describing the transition speed.
*/
var showElements = function (elements, speed) {
	if (!elements.length) elements = [elements];
	if (!speed) speed = 'none';
	for (var i = 0; i < elements.length; i++) {
		elements[i].classList.remove('hide', 'transition-fast', 'transition-slow', 'transition-none');
		elements[i].classList.add('show', 'transition-' + speed);
	}
};
function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex ;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}
/**
* Turn checkboxes into Material switches.
* @param {object} checkbox
* @param {callback} callback
*/
var toSwitch = function (checkbox, callback) {
	var label = checkbox.parentNode
	, newSwitch;
	if (label.tagName !== 'LABEL') return;

	label.classList.add('switch');
	
	if (checkbox.checked) {
		label.classList.add('checked');
		callback(checkbox);
	}
	
	checkbox.addEventListener('change', function (event) {
		event.target.parentNode.classList.toggle('checked');
		callback(event.target);
	}, false);
	
	newSwitch = document.createElement('span');
	newSwitch.classList.add('widget');
	label.insertBefore(newSwitch, checkbox);
}
var grayscale = function (target) {
	if (target.checked) {
		document.body.classList.add('desaturate');
	} else {
		document.body.classList.remove('desaturate');
	}
};
var shrink = function (target) {
	if (target.checked) {
		document.body.classList.add('shrink');
		touchContainer.get('swipe').set({ enable: true });
	} else {
		document.body.classList.remove('shrink');
		// Allow mobile devices to pan around full-size image.
		touchContainer.get('swipe').set({ enable: false });
	}
};
window.onload = function () {
	touchContainer = new Hammer(document.querySelector('#slideshow'));
	touchContainer.on('swipeleft', slideshowNext);
	touchContainer.on('swiperight', slideshowBack);

	$('#input-files').change(handleFiles);
	$('#speed').change(countdownRestart);
	$('#start').click(initializeSlideshow);
	$('#next').click(slideshowNext);
	$('#previous').click(slideshowBack);
	$('#pause').click(slideshowPauseToggle);
	
	toSwitch($('#desaturate')[0], grayscale);
	toSwitch($('#shrink')[0], shrink);
}
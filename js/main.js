/* global Hammer */
/* global $ */
var reader;
var touchContainer;
var touch = {};

var playlist = {
	create: function (files) {
		var imgType = /^image\//;
		// start at -1 because it will increment to 0 to get first image.
		this.pos = -1;
		this.array = [];
		playHistory.array = [];
		playHistory.pos = 0;
		// Transfer FileList to our own array for sorting.
		for (var i = 0; i < files.length; i++) {
			// Add a File blob to the playlist, excluding non-images.
			if (!imgType.test(files[i].type)) continue;
			this.array.push(files[i]);
		}
		files = null;
		shuffle(this.array);
	},
	next: function () {
		var img = this.array[playlist.pos];
		if (playlist.pos >= this.array.length) {
			// The end.
			$('#time-limit').countdown('destroy');
			hideElements($('#slideshow')[0], 'fast');
			document.body.classList.remove('slideshow-started');
			configPanel().show;
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
	var delay = getDelay()
	, slideshow = $('#slideshow')[0];
	
	// begin fading out.
	hideElements(slideshow, 'fast'); // 500 ms
	
	// Change to next image after 500ms.
	setTimeout(function () {
		// Only when image is loaded will it fade in.
		reader.readAsDataURL(img);
		$('#time-limit').countdown('destroy');
	}, 500);
	
	// Restart the countdown timer and show image.
	setTimeout(function () {
		countdownRestart();
	}, delay + 500);
};
var handleFiles = function (e) {
	playlist.create(e.target.files);
	initializeSlideshow();
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
var getDelay = function () {
	return +$('input[name="delay"]:checked').val();
};
var initializeSlideshow = function (e) {
	var img = document.querySelector('#image-container img') || new Image();
	var $shim = $('#config .shim')[0] || $('<div class="shim" />');
	
	reader = new FileReader();
	reader.onload = (function (aImg) {
		return function (e) {
			aImg.src = e.target.result;
			showElements($('#slideshow')[0], 'fast', getDelay());
		};
	})(img);
	
	document.querySelector('#image-container').appendChild(img);
	
	document.querySelector('#previous').removeAttribute('hidden');
	document.querySelector('#pause').removeAttribute('hidden');
	document.querySelector('#next').removeAttribute('hidden');
	
	document.body.classList.add('slideshow-started');
	
	// Allow an arbitrary delay so the user sees where the panel goes.
	$('#config .panel').append($shim);
	setTimeout(function () {
		$('#config .shim').remove();
		configPanel().hide;
	}, 800);
	
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
var showElements = function (elements, speed, delay) {
	if (!elements.length) elements = [elements];
	if (!speed) speed = 'none';
	setTimeout(function () {
		for (var i = 0; i < elements.length; i++) {
			elements[i].classList.remove('hide', 'transition-fast', 'transition-slow', 'transition-none');
			elements[i].classList.add('show', 'transition-' + speed);
		}
	}, delay || 0);
};
function shuffle (array) {
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
var configPanel = function (e) {
	var panel = document.querySelector('#config .panel'),
	isRetracted = panel.classList.contains('retract');

	var show = function () {
		panel.classList.add('retract');
		panel.style.marginTop = -panel.offsetHeight + 'px';
		slideshowResume();
	};
	
	var hide = function () {
		panel.classList.remove('retract');
		panel.style.marginTop = '';
		slideshowPause();
	};
	
	// Default toggle behavior.
	if (isRetracted) {
		hide();
	} else {
		show();
	}
	return {
		show: this.show,
		hide: this.hide
	}
};
var hideElementsTimeout;
var cancelHideListener = function () {
	clearTimeout(hideElementsTimeout);
	hideElementsTimeout = null;
};
var movementListener = function (e) {
	if (touch.touched) return;
	cancelHideListener();
	showElements([$('#controls')[0], $('#config .handle')[0]], 'fast');
	hideElementsTimeout = setTimeout(mouseStopped, 1000);
};
var mouseStopped = function () {
	cancelHideListener();
	hideElements([$('#controls')[0], $('#config .handle')[0]], 'fast');
};
var touchListener = function (e) {
	var elements = document.querySelectorAll('#controls, #config .handle');
	// Create touched property to intercept mousemove event.
	touch.touched = true;

	if (elements[0].classList.contains('show')) {
		hideElements(elements, 'fast');
	}
	else {
		showElements(elements, 'fast');
	}
};
window.onload = function () {
	touchContainer = new Hammer(document.querySelector('#image-container'));
	touchContainer.on('swipeleft', function () {
		slideshowNext();
		hideElements([$('#controls')[0], $('#config .handle')[0]], 'fast');
	});
	touchContainer.on('swiperight', function () {
		slideshowBack()
		hideElements([$('#controls')[0], $('#config .handle')[0]], 'fast');
	});
	
	$('#image-container').mousemove(movementListener);
	$('#controls, #config').mouseenter(cancelHideListener);
	$('#image-container')[0].addEventListener('touchend', touchListener, false);

	$('#input-files').change(handleFiles);
	//$('#speed').change(countdownRestart);
	$('#next').click(slideshowNext);
	$('#previous').click(slideshowBack);
	$('#pause').click(slideshowPauseToggle);
	
	$('#config .handle').click(configPanel);
	
	toSwitch($('#desaturate')[0], grayscale);
	toSwitch($('#shrink')[0], shrink);
}
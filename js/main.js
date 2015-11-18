(function () {
	var reader = new FileReader();
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
				// The end. Provide a way to restart.
				$('#time-limit').countdown('destroy');
				hideElements($('#slideshow')[0], 'fast');
				document.body.classList.remove('slideshow-started');
				configPanel('show');
				$('#restart').show();
				return;
			}
			// Change to a new image.
			change(img, 500, getDelay());
			
			// Update the playlist history.
			playHistory.array.push(img);
			playHistory.pos = playHistory.array.length - 1;
		}
	};
	var playHistory = {
		back: function () {
			if (this.pos < 1) return;
			change(this.array[--this.pos], 500, 0);
		},
		forward: function () {
			if (this.pos >= this.array.length - 1) return;
			change(this.array[++this.pos], 500, getDelay());
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
	var handleFiles = function (e) {
		var files = document.querySelector('#input-files').files;
		playlist.create(files);
		initializeSlideshow();
	};
	var initializeSlideshow = function (e) {
		var $shim = $('#config .shim')[0] || $('<div class="shim" />');

		// Begin after a delay.
		$('#config .panel').append($shim);
		setTimeout(function () {
			document.body.classList.add('slideshow-started');
			$('#config .shim').remove();
			configPanel('hide');
			$('#restart').hide();
			showElements($('#slideshow')[0], 'fast');
			findNextImage();
		}, 800);
	};
	// TODO: reader.onloadstart
	var change = function (img, speed, delay) {
		var $slideshow = $('#image-container');
		
		// Handle load event.
		reader.onload = function (e) {
			$('#image-container img')[0].src = e.target.result;
			showElements($slideshow[0], 'fast', delay);
		}
		
		// begin fade out.
		hideElements($slideshow[0], 'fast'); // 500 ms
		$('#time-limit').countdown('destroy');
		
		// Change to next image after fade.
		setTimeout(function () {
			reader.readAsDataURL(img);
		}, speed);
		
		// Restart the countdown timer
		setTimeout(countdownRestart, delay + speed);
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
	};
	var countdownRestart = function () {
		if (!document.body.classList.contains('slideshow-started')) return;
		$('#time-limit').countdown('destroy');
		countdownAdd(getSpeed());
		slideshowResume();
	};
	var getSpeed = function () {
		return +$('#speed option:selected').val();
	};
	var getDelay = function () {
		return +$('input[name="delay"]:checked').val();
	};
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
		} else {
			document.body.classList.remove('shrink');
		}
	};
	var configPanel = function (action) {
		var panel = document.querySelector('#config .panel')
		, retracted = panel.classList.contains('retract');

		var hide = function () {
			panel.classList.add('retract');
			panel.style.marginTop = -panel.offsetHeight + 'px';
			slideshowResume();
		};

		var show = function () {
			panel.classList.remove('retract');
			panel.style.marginTop = '';
			slideshowPause();
		};

		switch (action) {
			case 'show':
				show();
				break;
			case 'hide':
				hide();
				break;
			default:
				if (retracted) {
					show();
				} else {
					hide();
				}
				break;
		}
	};
	var hideElementsTimeout;
	var cancelHideListener = function () {
		clearTimeout(hideElementsTimeout);
		hideElementsTimeout = null;
	};
	var movementListener = function (e) {
		// Don't continue if touch event is detected. Users are unlikely to
		// change from touch screen to mouse.
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
	var toggleSwipe = function (e, obj) {
		// Disable swipe when shrink to fit is disabled.
		if (e.target.checked) {
			obj.get('swipe').set({ enable: true });
		} else {
			obj.get('swipe').set({ enable: false });
		}
	};
	var shortcutsListener = function (e) {
		var k = e.keyCode;
		
		//console.log(k);
		
		if (k === 69) { $('#desaturate').click(); } // [e]
		if (k === 81) { $('#shrink').click(); } // [q]
		if (k === 83) { $('#pause').click(); } // [s]
		if (k === 68) { $('#next').click(); } // [d]
		if (k === 65) { $('#previous').click(); } // [a]
		if (k === 90) { $('#speed').focus(); } // [z]
		if (k === 87) { configPanel(); } // [w]
	};
	window.onload = function () {
		var touchContainer = new Hammer($('#image-container')[0]);
		
		touchContainer.on('swipeleft', slideshowNext);
		touchContainer.on('swiperight', slideshowBack);
		hideElements($('#slideshow')[0], 'fast');
		$('#restart').hide();
		
		$('#image-container').mousemove(movementListener);
		$('#controls, #config').mouseenter(cancelHideListener);
		$('#image-container')[0].addEventListener('touchend', touchListener, false);
	
		$('#input-files').change(handleFiles);
		$('#speed').change(function () {
			countdownRestart();
			slideshowPause();
		});
		$('#next').click(slideshowNext);
		$('#previous').click(slideshowBack);
		$('#pause').click(slideshowPauseToggle);
		$('#restart').click(handleFiles);
		
		$('#config .handle').click( function (e) { configPanel(); });
		
		toSwitch($('#desaturate')[0], grayscale);
		toSwitch($('#shrink')[0], shrink);
		$('#shrink').change(function (e) { toggleSwipe(e, touchContainer); });
		
		$(document).keyup(shortcutsListener);
	}
})();
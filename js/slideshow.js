/* global Hammer */
/* global $ */
$(document).ready(function () {
	var addVersionNumber = (function () {
		var v = '0.9.0';
		$('.version').text(v);
	})();
	var localStorageRequired = (function () {
		if (!Boolean(localStorage)) {
			alert('Error: the web browser doesn\'t allow local storage. Drawing Timer is confirmed to work with Chrome, Firefox and Opera.');
		}
	})();
	
	var navigation = {
		init: function () {
			this.selectMenuItem();
			window.addEventListener('hashchange', this.selectMenuItem.bind(this), false);

			hideElements(controls.element);
			$('#menu a[href="#slideshow"]').parent().hide();

			// Set window size. NWJS only?
			// TODO: only run on app load and remember size.
			//window.resizeTo(window.screen.availWidth / 2, window.screen.availHeight);
		},
		selectMenuItem: function () {
			var hash = location.hash
			, link
			, active = document.querySelector('#menu .selected');

			// If there's no hash, go to #albums, triggering change event,
			// which runs selectMenuItem(), now with hash.
			if (!hash) {
				document.location.hash = '#albums';
				return;
			}
			link = document.querySelector('#menu a[href="' + hash + '"]');

			if (active) { active.classList.remove('selected'); }
			link.parentNode.classList.add('selected');
			this.openPage(hash);
		},
		openPage: function (hash) {
			document.body.id = document.location.hash.replace('#', 'page-');
			modal.hide();
			showElements(document.querySelector('#menu'), 'fast');

			switch (hash) {
				case '#slideshow':
					slideshow.show();
					settings.resetForm();
					break;
				case '#albums':
					albums.show();
					settings.resetForm();
					break;
				case '#setup':
					settings.show();
					break;
				case '#about':
					about.show();
					settings.resetForm();
					break;
			}
		}
	};
	/**
	 * The setup page.
	 */
	var settings = {
		init: function () {
			var preview = document.querySelector('#preview');
			var previewImg = document.createElement('img');
			previewImg.setAttribute('alt', 'Cover image. Did you get the image from the correct folder?');
			preview.classList.add('hidden');
			preview.appendChild(previewImg);
			
			document.querySelector('#reset').addEventListener('click', this.resetForm.bind(this), false);
			document.querySelector('#save').addEventListener('click', this.handleSave.bind(this), false);
			
			document.querySelector('#delete-all').addEventListener('click', this.deleteAllData, false);

			// get image file names on change event.
			this.fileListToTextarea(document.querySelector('#album-images')
			, document.querySelector('#album-images-data'));
			this.fileListToTextarea(document.querySelector('#album-cover')
			, document.querySelector('#album-cover-data'));
			
			if (isNWJS()) {
				$('.hide-nwjs').hide();
			}
			$('#delete').hide();
			document.querySelector('#delete').disabled = true;
			document.querySelector('#delete').addEventListener('click', this.deleteData.bind(this), false);
		},
		show: function () {
			slideshow.pause();
			document.querySelector('#album-name').focus();
		},
		// Retrieve absolute folder path. NWJS only.
		previewListener: function (e) {
			var $t = $(e.currentTarget).parent().find('input[type="file"]')
			, path = this.directoryPathFromFile($t[0]);

			if (path) {
				document.querySelector('#album-path').value = path;
			}

			this.getPreview(path);
		},
		// Show preview image.
		getPreview: function (path) {
			var noCover = document.querySelector('#field-cover .files-info').classList.contains('empty')
			, preview = document.querySelector('#preview')
			, images = document.querySelector('#album-images-data').value.split(',')
			, cover = document.querySelector('#album-cover-data').value;

			if (!path) {
				preview.classList.add('hidden');
				document.querySelector('#field-cover').classList.add('hidden');
				return;
			}
			
			// If there's an image but no cover, set cover to the first image.
			if (noCover && images[0]) {
				cover = images[0];
			}
			
			path = makePath(path);
			
			preview.classList.remove('hidden');
			document.querySelector('#field-cover').classList.remove('hidden');

			preview.querySelector('img').setAttribute('src', path + cover);
		},
		handleSave: function (e) {
			var cover = document.querySelector('#album-cover-data').value.split()
			, images = document.querySelector('#album-images-data').value.split(',')
			, form = document.querySelector('#setup form')
			, path = document.querySelector('#album-path').value
			, valid = true
			, errors = {}
			, originalAlbum = form.getAttribute('data-album')
			, album = document.querySelector('#album-name').value;
			
			e.preventDefault();

			// change backslashes to forward slashes.
			path = path.split(/\\/).join('/');

			// cover image is optional.
			if (cover.length > 0) {
				cover = cover[0];
			} else {
				cover = null;
			}

			removeErrorMessages(form);
			if (localStorage.getItem(album) && (originalAlbum !== album)) {
				valid = false;
				errors.dupe = 'Album name is not unique.';
			}
			if (album.length < 1) {
				valid = false;
				errors.name = 'Album name is required.';
			}
			if (path.length < 1) {
				valid = false;
				errors.path = 'Folder path is required.';
			}
			if (images.length < 2) {
				valid = false;
				errors.images = 'At least two images are required.';
			}
			if (!valid) {
				for (var prop in errorMessages(errors)) {
					form.insertBefore(errorMessages(errors)[prop], form.querySelector('h2'));
				}
				return;
			}
			
			this.add(album, {
				dataType: 'drawingtimer-album',
				path: path,
				images: images,
				cover: cover,
				weight: 0
			});

			// display success message.
			successMessage('Saved successfully', 3000);

			// Changing album name? Delete original after creating new one.
			if (originalAlbum !== null && (originalAlbum !== album)) {
				localStorage.removeItem(originalAlbum);
			}
			this.resetForm();
			document.location.hash = '#albums';
		},
		add: function (key, data) {
			localStorage.setItem(key, JSON.stringify(data));
		},
		deleteData: function (e) {
			var key = document.querySelector('#album-name').value;
			e.preventDefault();
			localStorage.removeItem(key);
			successMessage('Deleted album successfully', 3000);
			this.resetForm();
			document.location.hash = '#albums';
		},
		deleteAllData: function (e) {
			var confirm = window.confirm('Are you sure you want to delete all stored data for Drawing Timer?');
			e.preventDefault();
			if (confirm) {
				localStorage.clear();
				successMessage('All data associated with Drawing Timer was removed.', 3000);
				location.hash = '#albums';
			}
		},
		// Populate the form for editing an album.
		edit: function () {
			var key = getCurrentAlbumKey();
			var data = JSON.parse(localStorage.getItem(key));

			// Use data attr to store original album name, so we can delete the
			// old album if the name changes.
			document.querySelector('#setup form').setAttribute('data-album', key);
			document.querySelector('#setup h2').innerHTML = 'Edit <em>' + key + '</em>';

			// Show file information to user.
			if (data.cover) {
				$('#album-cover').parent().find('.files-info div')
					.text(data.cover)
					.parent().removeClass('empty');
			}
			if (data.images.length > 0) {
				$('#album-images').parent().find('.files-info div')
					.text(data.images.length + ' images')
					.parent().removeClass('empty');
			}

			document.querySelector('#album-name').value = key;
			document.querySelector('#album-path').value = data.path;
			document.querySelector('#album-images-data').value = data.images;
			document.querySelector('#album-cover-data').value = data.cover;

			settings.getPreview(addTrailingSlash(data.path));

			$('#delete').show();
			document.querySelector('#delete').disabled = false;
		},
		fileListToTextarea: function (input, tempStorage) {
			input.addEventListener('change', (function (e) {
				var output = [];
				var files = e.target.files;
				var $filesInfo = $(e.currentTarget).parent().find('.files-info');
				
				// When cancelling out of file selection dialog we shouldn't lose our previous selections.
				if (files.length < 1) return;

				for (var i = 0, f; f = files[i]; i++) {
					if (!f.type.match('image.*')) {
						continue;
					}
					output.push(f.name);
				}

				// Store data in textarea.
				tempStorage.value = output;
				
				if (output.length > 0) {
					$filesInfo.find('div').text(output);
					$filesInfo.removeClass('empty');
				}
				if (output.length > 1) {
					$filesInfo.find('div').text(output.length + ' images');
				}
				
				// TODO: check if listener is doubling up.
				this.previewListener(e);
			}).bind(this), false);
		},
		directoryPathFromFile: function (input) {
			var result;

			if ((input.files.length > 0) && (input.files[0].path)) {
				// convert back slashes to forward, then return everything up
				// to and including the last slash.
				result = input.files[0].path.replace(/\\/g, '/').match(/.+\//);
				result = result[0];
			}
			else {
				// the path might already be set in the textfield.
				result = document.querySelector('#album-path').value;
			}
			return result;
		},
		resetForm: function () {
			var form = document.querySelector('#setup form');
			form.querySelector('#album-name').value = null;
			form.querySelector('#album-path').value = null;
			form.querySelector('#album-images').value = null;
			form.querySelector('#album-cover').value = null;
			form.querySelector('#album-images-data').value = null;
			form.querySelector('#album-cover-data').value = null;
			form.querySelector('#setup h2').textContent = 'Create a New Album';
			$('#delete').hide();
			$('.field-item .files-info div').text(null);
			$('.field-item .files-info').addClass('empty');
			form.setAttribute('data-album', null);
			removeErrorMessages(form);
			this.getPreview(null);
		},
	};
	settings.init();
	/** 
	 * Displaying and loading albums.
	 */
	var albums = {
		init: function () {},
		show: function () {
			// Remove all items before adding them back in. Like refresh.
			$('#albums li.album:not(.template)').remove();
			this.display();
			
			slideshow.pause();
			$('#start').show();
			$('#pause, #back, #next').hide();
		},
		display: function () {
			var key, data, path;
			var container = document.querySelector('#albums ul');
			var album;

			for (var i = 0; i < localStorage.length; i++) {
				key = localStorage.key(i);
				data = localStorage.getItem(key);
				album = container.querySelector('.album.template').cloneNode(true);
				album.classList.remove('template');

				// check if string should be JSON'd.
				if (data.charAt(0) !== '{') continue;

				data = JSON.parse(data);
				if (data.dataType !== 'drawingtimer-album') continue;

				album.setAttribute('data-album', key);
				album.addEventListener('click', this.load.bind(this), false);
				
				path = makePath(data.path);
				
				if (data.cover) {
					album.querySelector('img').setAttribute('src', path + data.cover);
				}
				else {
					album.querySelector('img').setAttribute('src', path + data.images[0]);
				}
				
				album.querySelector('.label').textContent = key;
				
				container.appendChild(album);
			}
			container.appendChild(document.querySelector('#new-album'));
		},
		load: function (event) {
			var key = event.currentTarget.getAttribute('data-album');
			var data = JSON.parse(localStorage.getItem(key));
			
			controls.element.setAttribute('data-album', key);
			$('#controls .header').text(key);
			$('#count').text(data.images.length);
			
			$('#albums li').removeClass('selected');
			event.currentTarget.classList.add('selected');
			modal.show();
		}
	};
	albums.init();

	var playlist = {
		create: function (files) {
			// start at -1 because it will increment to 0 to get first image.
			this.pos = -1;
			this.array = [];
			history.array = [];
			history.pos = 0;
			while (files.length > playlist.array.length) {
				this.update(files);
			}
		},
		update: function (files) {
			var rn = Math.floor(Math.random() * files.length)
			, f = files[rn]
			, a = this.array;
			if (a.indexOf(f) === -1) {
				a.push(files[rn]);
			}
		},
		next: function () {
			var a = this.array
			, img = a[playlist.pos]
			, end = playlist.pos >= a.length;
			if (end) {
				img = false;
			}
			slideshow.changeImageTo(img);
			history.array.push(img);
			history.pos = history.array.length - 1;
		}
	};
	
	var endOfPlaylist = function () {
		slideshow.img.removeAttribute('src');
	};
	
	var history = {
		back: function () {
			if (history.pos < 1) return;
			slideshow.changeImageTo(history.array[--history.pos]);
		},
		forward: function () {
			if (history.pos >= history.array.length - 1) return;
			slideshow.changeImageTo(history.array[++history.pos]);
		}
	};
	
	var findNextImage = function () {
		// In history if current position in history is not the same as the
		// length of the history array.
		var inHistory = !(history.array.length - 1 === history.pos || history.array.length < 1);
		if (!inHistory) {
			playlist.next(playlist.pos++);
		} else {
			history.forward();
		}
	};
	var slideshow = {
		element: document.querySelector('#picture'),
		img: document.querySelector('#picture img'),
		init: function () {
			// event listeners.
			this.addListeners();
		},
		show: function () {
			$('#menu a[href="#slideshow"]').parent().show();
			
			if (document.body.classList.contains('timer-on')) {
				slideshow.resume();
			}
			$('#start').hide();
			$('#pause, #back, #next').show();
			// If a slideshow is open.
			if (slideshow.album) {
				$('#controls .header').text(slideshow.album);
				$('#count').text(slideshow.images.length);
				controls.element.setAttribute('data-album', this.album);
			} else {
				location.hash = '#albums';
				$('#menu a[href="#slideshow"]').parent().hide();
			}
			hideElements(document.querySelector('#menu'), 'slow');
		},
		launch: function (album) {
			this.album = album;
			this.data = JSON.parse(localStorage.getItem(this.album));
			this.images = this.data.images;
			this.path = makePath(this.data.path);
			
			playlist.create(this.images);

			document.body.classList.add('timer-on');
			$('#menu a[href="#slideshow"]').parent().show();

			this.next();
			// Go to slideshow page after a small delay.
			// Avoids showing a flash of the previous slideshow.
			setTimeout(function () {
				location.replace('#slideshow');
			}, 0);

			$('#speed').change(function () {
				if (location.hash === '#slideshow') {
					slideshow.reset();
					slideshow.getDelay();
					slideshow.addTimer();
					slideshow.resume();
				}
			});
		},
		getDelay: function () {
			this.delayPeriod = $('#speed option:selected').val();
		},
		reset: function () {
			$('#time').countdown('destroy');
		},
		next: function () {
			hideElements(this.img.parentNode, 'fast');
			slideshow.reset();
			slideshow.getDelay();
			
			// Change the image after the last one's had time to fade out.
			setTimeout(function () {
				findNextImage();
			}, 500);

			// Reveal the new image when it's ready
			setTimeout(function () {
				// Don't resume timer if there's no source image.
				if (slideshow.img.getAttribute('src')) {
					slideshow.addTimer();
					slideshow.resume();
				}
				showElements(slideshow.img.parentNode, 'fast');
			}, 500);
		},
		previous: function () {
			hideElements(this.img.parentNode, 'fast');
			slideshow.reset();
			slideshow.getDelay();
			
			setTimeout(function () {
				history.back();
			}, 500);
			
			setTimeout(function () {
				slideshow.addTimer();
				slideshow.resume();
				showElements(slideshow.img.parentNode, 'fast');
			}, 500);
		},
		pause: function () {
			$('#time').countdown('pause');
			document.body.classList.add('timer-paused');
		},
		resume: function () {
			$('#time').countdown('resume');
			document.body.classList.remove('timer-paused');
		},
		changeImageTo: function (name) {
			var file = this.path + name;
			if (name) {
				this.img.setAttribute('src', file);
			} else {
				endOfPlaylist();
			}
		},
		addListeners: function () {
			var page = document.querySelector('#slideshow');
			var elements = document.querySelectorAll('#controls, #menu');

			$('#next').click((function () {
				this.next();
			}).bind(this));

			$('#back').click((function () {
				this.previous();
			}).bind(this));

			touchContainer.on('swipeleft', (function (ev) {
				this.next();
				hideElements(elements, 'fast');
			}).bind(this));

			touchContainer.on('swiperight', (function (ev) {
				this.previous();
				hideElements(elements, 'fast');
			}).bind(this));
			
			// Watch for mouse movement or touch.
			page.addEventListener('mousemove', this.movementListener, false);
			page.addEventListener('touchend', this.touchListener, false);
			
			for (var i = 0; i < elements.length; i++) {
				elements[i].addEventListener('mouseenter', this.cancelHideListener, false);
			}
		},
		mouseStopped: function () {
			var elements = document.querySelectorAll('#controls, #menu');
			slideshow.cancelHideListener();
			hideElements(elements, 'fast');
		},
		movementListener: function (e) {
			var elements = document.querySelectorAll('#controls, #menu');
			if (touch.touched) return;
			slideshow.cancelHideListener();
			showElements(elements, 'fast');
			slideshow.hideElementsTimeout = setTimeout(slideshow.mouseStopped, 1000);
		},
		touchListener: function (e) {
			var elements = document.querySelectorAll('#controls, #menu');
			
			// Create touched property to intercept mousemove event.
			touch.touched = true;
	
			if (elements[0].classList.contains('show')) {
				hideElements(elements, 'fast');
			}
			else {
				showElements(elements, 'fast');
			}
		},
		cancelHideListener: function () {
			clearTimeout(slideshow.hideElementsTimeout);
			slideshow.hideElementsTimeout = null;
		},
		addTimer: function () {
			$('#time').countdown({
				until: +slideshow.delayPeriod,
				format: 'MS',
				compact: true,
				onExpiry: function () {
					slideshow.next();
				}
			});
		}
	};
	
	var touchContainer = new Hammer(document.querySelector('#slideshow'));
	slideshow.init();
	
	var about = {
		init: function () {},
		show: function () {
			slideshow.pause();
		}
	}
	about.init();
	
	/**
	 * Contains all the slideshow controls.
	 * Can be accessed from different pages.
	 */
	var controls = {
		element: document.querySelector('#controls'),
		init: function () {
			toSwitch($('#desaturate')[0], this.grayscale);
			toSwitch($('#shrink')[0], this.shrink);
			
			this.addListeners();
			document.querySelector('#edit').addEventListener('click', settings.edit, false);
		},
		addListeners: function () {
			this.startListener();
			this.pauseListener();
		},
		startListener: function () {
			$('#start').click(function () {
				var key = $('#albums li.selected').data('album');
				slideshow.launch(key);
			});
		},
		pauseListener: function () {
			$('#pause').click(function () {
				if (document.body.classList.contains('timer-paused')) {
					slideshow.resume();
				} else {
					slideshow.pause();
				}
			});
		},
		grayscale: function (target) {
			if (target.checked) {
				document.body.classList.add('desaturate');
			} else {
				document.body.classList.remove('desaturate');
			}
		},
		shrink: function (target) {
			if (target.checked) {
				document.body.classList.add('shrink');
				touchContainer.get('swipe').set({ enable: true });
			} else {
				document.body.classList.remove('shrink');
				// Allow movile device users to pan around full-size image.
				touchContainer.get('swipe').set({ enable: false });
			}
		}
	};
	var modal = {
		init: function () {
			this.element = document.querySelector('#modal');
			this.element.addEventListener('click', this.hide, false);
		},
		show: function () {
			showElements([modal.element, controls.element], 'fast');
		},
		hide: function () {
			hideElements([modal.element, controls.element], 'fast');
		}
	};
	modal.init();
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
	var touch = {};
	/**
	 * Check if we're running inside nw.js.
	 */
	function isNWJS () {
		try {
			return (typeof require('nw.gui') !== 'undefined');
		} catch (e) {
			return false;
		}
	}
	/**
	 * Create a single node containing a success message.
	 * @param {string} message
	 * @param {number} removeAfter - Milliseconds
	 */
	var successMessage = function (message, removeAfter) {
		var element = document.createElement('div')
		, remove
		, ref = document.querySelector('#time');
		
		element.classList.add('success');
		element.style.left = ref.offsetWidth + ref.offsetLeft + 20 + 'px';
		element.textContent = message;
		
		remove = setTimeout(function () {
			element.remove();
		}, removeAfter);
		
		return document.body.appendChild(element);
	};
	/**
	 * Create a list of nodes containing unique error messages.
	 * @param {object} errors
	 */
	var errorMessages = function (errors) {
		var elements = {};
		
		for (var prop in errors) {
			elements[prop] = document.createElement('div');
			elements[prop].classList.add('error');
			elements[prop].textContent = errors[prop];
		}
		
		return elements;
	};
	/**
	 * @param {object} container
	 */
	var removeErrorMessages = function (container) {
		var elements = container.querySelectorAll('.error');
		for (var i = 0; i < elements.length; i++) {
			elements[i].remove();
		}
	}
	var getCurrentAlbumKey = function () {
		return document.querySelector('#controls').getAttribute('data-album');
	}
	var compose = function(f,g) {
		return function(x) {
			return f(g(x));
		};
	};
	var addTrailingSlash = function (str) {
		if (str.length - 1 !== str.lastIndexOf('/')) {
			str = str + '/';
		}
		return str;
	}
	var addFilePrefix = function (str) {
		if (str.charAt(0) !== '.') {
			str = 'file://' + str;
		}
		return str;
	}
	var makePath = compose(addFilePrefix, addTrailingSlash);
	/**
	 * Keyboard shortcuts
	 */
	document.addEventListener('keyup', function (e) {
		var k = e.keyCode
		, selectedSet;

		// Don't trigger from text inputs.
		if (e.target.getAttribute('type')) return;
		
		//console.log(k);
		if (k === 69) { // [e]
			$('#desaturate').click();
		}
		if (k === 81) { // [q]
			$('#shrink').click();
		}
		if (location.hash === '#albums') {
			if (k === 83) { // [s]
				$('#start').click();
			}
			if (k === 68) { // [d]
				selectedSet = document.querySelector('#albums li.selected');
				if (selectedSet) {
					$('#albums li.selected').next('.album').click();
				} else {
					$('#albums li:nth-of-type(2)').click();
				}
			}
			if (k === 65) { // [a]
				$('#albums li.selected').prev().click();
			}
		}
		if (location.hash === '#slideshow') {
			if (k === 83) { // [s]
				$('#pause').click();
			}
			if (k === 68) { // [d]
				$('#next').click();
			}
			if (k === 65) { // [a]
				$('#back').click();
			}
			if (k === 90) { // [z]
				document.querySelector('#speed').focus();
			}
			if (k === 87) { // [w]
				if (controls.element.classList.contains('hide')) {
					showElements([controls.element, document.querySelector('#menu')], 'fast');
				} else {
					hideElements([controls.element, document.querySelector('#menu')], 'fast');
				}
			}
		}

	}, false);
	navigation.init();
	controls.init();
});
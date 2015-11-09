var reader;

var playlist = {
	create: function (files) {
		// start at -1 because it will increment to 0 to get first image.
		this.pos = -1;
		this.array = [];
		playHistory.array = [];
		playHistory.pos = 0;
		while (files.length > this.array.length) {
			// Generate a random number within total number of files.
			var rn = Math.floor(Math.random() * files.length)
			// Pick a random file.
			, f = files[rn];
			
			// Push another File object to the playlist array. 
			if (this.array.indexOf(f) === -1) {
				this.array.push(f);
			}
		}
		slideshowReady();
	},
	next: function () {
		var img = this.array[playlist.pos]
		, end = playlist.pos >= this.array.length;
		if (end) {
			img = null;
		}
		// Change to a new image.
		reader.readAsDataURL(img);
		// Update the playlist history.
		playHistory.array.push(img);
		playHistory.pos = playHistory.array.length - 1;
	}
};
var playHistory = {
	back: function () {
		if (this.pos < 1) return;
		reader.readAsDataURL(this.array[--this.pos]);
	},
	forward: function () {
		if (this.pos >= this.array.length - 1) return;
		reader.readAsDataURL(this.array[++this.pos]);
	}
};
var findNextImage = function () {
	// In history if current position in history is not the same as the
	// length of the history array.
	var inHistory = !(playHistory.array.length - 1 === playHistory.pos || playHistory.array.length < 1);
	if (!inHistory) {
		playlist.next(playlist.pos++);
	} else {
		playHistory.forward();
	}
};
var handleFiles = function (e) {
	var files = e.target.files;
	if (files.length < 1) return;
	
	playlist.create(files);
};
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
	// TODO:
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
	
	findNextImage();
}
window.onload = function () {
	document.querySelector('#input-files').addEventListener('change', handleFiles, false);
	document.querySelector('#start').addEventListener('click', initializeSlideshow, false);
	document.querySelector('#next').addEventListener('click', slideshowNext, false);
	document.querySelector('#previous').addEventListener('click', slideshowBack, false);
	document.querySelector('#pause').addEventListener('click', slideshowPause, false);
}
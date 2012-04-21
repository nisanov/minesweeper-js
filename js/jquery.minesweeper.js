/* 
	Document   : js/minesweeper.js
	Created on : 12-Mar-2012
	Author     : Yasha Nisanov
	Description: A Minesweeper clone written in JavaScript.
*/

var minesweeper = {
	
	size     : 8,      // Track the size of the game board
	detected : 0,      // Track the number of clearances detected
	locked   : false,  // Track the locked state of the game board
	
	mine     : {       // The mine object
	
		count    : 0,  // Track the number of mines
		position : [], // Track the mine positions
		cleared  : []  // Track the cleared squares
	},
	
    /**
     * Initialize the minesweeper game board
     * 
     * @param  integer size The size of the game board grid
     * @return object       The minesweeper object
     */
	init            : function(size) {
		
		this.size = ( size >= 8 ? size : 8 ); // Ensure that size is at least 8 on initialization
		
		this.dom = { // Create an internal reference to each game element

			board    : $("#ms-board"),
			mode     : $("#ms-mode"),
			create   : $("#ms-create"),
			cheat    : $("#ms-cheat"),
			validate : $("#ms-validate"),
			save     : $("#ms-save"),
			load     : $("#ms-load")
		};
		
		if ( ! $.cookie("minesweeper_size") ) this.dom.load.attr("disabled", "disabled"); // Disable the load button if no saved game is detected
		
		this.dom.board.on("lock", $.proxy(this.lock, this));     // Bind custom game board lock trigger
		this.dom.board.on("unlock", $.proxy(this.unlock, this)); // Bind custom game board unlock trigger
		this.dom.create.on("click", $.proxy(this.create, this)); // Create event binds to each game element
		this.dom.cheat.on("click", $.proxy(this.cheat, this));   // Display the mine locations		
		this.dom.save.on("click", $.proxy(this.save, this));     // Bind the event trigger to save the game board
		this.dom.load.on("click", $.proxy(this.load, this));     // Bind the event trigger to load the saved game board state
		
		this.dom.mode.val(this.size); // Ensure that the game mode reflects the mode set in initialization
		
		this.create(); // Call to create the minesweeper board based on the requested size
		
		return this;
	},
	
	/**
	 * Create the minesweeper game board
	 * 
     * @param  integer size The size of the game board grid
	 */
	create          : function(size) {

		this.dom.cheat.text("Cheat"); // Ensure that the cheat button text is reset
		this.dom.board.trigger("unlock").empty(); // Reset the locked state and empty the game board

		this.size     = parseInt( isNaN(size) ? this.dom.mode.val() : this.dom.mode.val(size).val() ); // Set the size based on the game mode selected or from the initial size
		this.detected = 0;
		
		var position = 1, col = undefined, row = undefined, span = undefined

		for ( col = 0; col < this.size; col++ ) { // Create for each column
			
			for ( row = 0; row < this.size; row++ ) { // Create for each row
				
				span = $('<span for="' + ( position++ ) + '" class="ms-board-square"></span>');
				
				if ( col > 0 && row == 0 ) span.addClass("row"); // Clear for a new row
				
				this.dom.board.append(span);
			}
		}
				
		this.dom.square = $(".ms-board-square").on("click", $.proxy(this.click, this)).on("contextmenu", $.proxy(this.flag, this)); // Create an internal reference to each game board square and event triggers for clicking and flagging

		this.arm(); // Call to configure and arm the mines
	},


	/**
	 * Click a square to check for mines
	 * 
	 * @param  Event event The event object to identify the source
	 */
	click           : function(event) {

		var source = event.target || event.srcElement;

		if ( ! this.locked && ! $(source).hasClass("flagged") && ! $(source).hasClass("cleared") && ! $(source).hasClass("exploded") ) { // Ensure that the game board square is not locked, flagged, cleared or exploded
			
			this.detected++;
			
			$(source).addClass("cleared");
			
			this.dom.save.removeAttr("disabled"); // Ensure that the save button is enabled
			
			if ( this.armed( parseInt($(source).attr("for")) ) ) { // Mine detected GAME OVER
				
				for ( var i in this.mine.position ) $(this.dom.square[this.mine.position[i] - 1]).toggleClass("exploded"); // Explode all mine locations
				
				confirm("GAME OVER !!!\n\nNew Game ?") ? this.create() : this.dom.board.trigger("lock");
			}
			else { // NO mines detected; tile cleared
				
				var detected = this.scan( parseInt($(source).attr("for")) );
				
				$(source).text(detected || "");
				
				if ( ! detected ) this.clear( parseInt($(source).attr("for")) ); // No mines where detected in the current radius

				if ( this.detected == this.mine.cleared.length ) { // Game complete when the number detected matches the number of clear squares

					confirm("CONGRATULATIONS !!!\n\nYou have successfully cleared the game board.\n\nNew Game ?") ? this.create() : this.dom.board.trigger("lock");
				}
			}
		}
	},

	/**
	 * Flag the square
	 * 
     * @param  Event event The event object to identify the source
	 */
	flag            : function(event) {

		var source = event.target || event.srcElement;

		if ( ! this.locked && ! $(source).hasClass("cleared") ) $(source).toggleClass("flagged");
		
		return false; // Bypass context menu
	},
	
	/**
	 * Configure and arm the mines upon the game board
	 */
	arm             : function() {
		
		// Initialize the mine count at 10 per 8 x 8
		this.mine.count = Math.floor( this.size / 8 * this.size / 8 * 10 );
		
		// Reset the positions and cleared
		this.mine.position = [];
		this.mine.cleared = [];
		
		for ( var i = 1; i <= this.size * this.size; i++ ) this.mine.cleared.push(i); // Populate a temporary array with all the possible grid positions
		
		for ( var m = 1; m <= this.mine.count; m++ ) this.mine.position.push( this.mine.cleared.splice( Math.floor( Math.random() * this.mine.cleared.length), 1 )[0] ); // Randomly arm the mine positions
	},
	
	/**
	 * Clear adjacent game board square and mark them accordingly
	 */
	clear           : function(id) {

		var cur = this.grid(id);
		
		if ( cur.col > 1 ) this.check( id - 1 );         // Check the square to the left
		
		if ( cur.col < this.size ) this.check( id + 1 ); // Check the square to the right
		
		if ( cur.row > 1 ) { // Check the square above

			this.check( id - this.size );
			
			if ( cur.col > 1 ) this.check( id - this.size - 1 );         // Check the square above and to the left
			
			if ( cur.col < this.size ) this.check( id - this.size + 1 ); // Check the square above and to the right
		}
		
		if ( cur.row < this.size ) { // Check the square below

			this.check( id + this.size );
		
			if ( cur.col > 1 ) this.check( id + this.size - 1 );         // Check the square to the left
			
			if ( cur.col < this.size ) this.check( id + this.size + 1 ); // Check the square to the right
		}
	},
	
	// Clear an individual game board square
	check           : function(id) {
			
		var detected = this.scan(id); // Get the number of surrounding mines detected
		
		$(this.dom.square[ id - 1 ]).text( detected || "" ); // Mark the current square
		
		if ( detected ) {

			if ( ! $(this.dom.square[ id - 1 ]).hasClass("cleared") ) { // Ensure that the square has not already been cleared

				$(this.dom.square[ id - 1 ]).addClass("cleared");

				this.detected++;
			}
		} 
		else $(this.dom.square[ id - 1 ]).click(); // Clear when surrounding mines otherwise perform a psuedo click to trigger a clearance of surrounding mines
	},
	
	// Determine the number or mines in the raduis
	scan            : function(id) {
		
		var cur = this.grid( id ), detected = 0;
		
		if ( cur.col > 1 ) { // Scan the square to the left
			
			if ( this.armed( id - 1 ) ) detected++; // Mine detected to the left
		}
		
		if ( cur.col < this.size ) { // Scan the square to the right
			
			if ( this.armed( id + 1 ) ) detected++; // Mine detected to the right
		}
		
		if ( cur.row > 1 ) { // Scan the square above
		
			if ( this.armed( id - this.size ) ) detected++; // Mine detected above
			
			if ( cur.col > 1 ) { // Scan the square above and to the left

				if ( this.armed( id - this.size - 1 ) ) detected++; // Mine detected above and to the left
			}
			
			if ( cur.col < this.size ) { // Scan the square above and to the right

				if ( this.armed( id - this.size + 1 ) ) detected++; // Mine detected above and to the right
			}
		}
		
		if ( cur.row < this.size ) { // Scan the squares below
			
			if ( this.armed( id + this.size ) )  detected++; // Mine detected below
		
			if ( cur.col > 1 ) { // Scan the square below and to the left

				if ( this.armed( id + this.size - 1 ) ) detected++; // Mine detected below and to the left
			}
			
			if ( cur.col < this.size ) { // Scan the square below and to the right

				if ( this.armed( id + this.size + 1 ) ) detected++; // Mine detected below and to the right
			}
		}
		
		return detected; // Return the count of mines in the radius
	},
	
	// Determine the grid position based on the sequential position
	grid            : function(id) {
		
		var row = Math.floor( id / this.size ), col = ( id / this.size - row++ ) * this.size;        
		
		if ( ! col ) { col = this.size; --row; } // Adjust the row and col accordingly for row intersections
		
		return { 'row': row, 'col': col };
	},

	// Determine whether or not a game board square is armed with a mine
	armed           : function(id) {
		
		return ( this.mine.position.indexOf(id) != - 1 ? true : false );
	},

	/**
	 * Lock the game board
	 * 
	 * @param  Event e The event object containing a reference to this object in e.data
	 */
	lock            : function() {
		
		if ( ! this.locked ) { // Ensure that the game board is infact unlocked

			this.dom.cheat.attr("disabled", "disabled");
			this.dom.validate.attr("disabled", "disabled");
			this.dom.save.attr("disabled", "disabled");
			
			this.locked = true;
		}
	},

	/**
	 * Unlock the game board
	 * 
	 * @param  Event e The event object containing a reference to this object in this
	 */
	unlock          : function() {

		if ( this.locked ) { // Ensure that the game board is infact locked

			this.dom.cheat.removeAttr("disabled");
			this.dom.validate.removeAttr("disabled");
			this.dom.save.attr("disabled", "disabled"); // Disable save because unlocking occurs during create game as save is only enabled after the first move
			
			this.locked = false;
		}
	},

	/**
	 * Display the mine locations
	 * 
	 * @param  Event e The event object containing a reference to this object in e.data
	 */
	cheat           : function() {

		if ( ! this.locked ) { // Ensure that the game board is not already locked
			
			for ( var i in this.mine.position ) $(this.dom.square[ this.mine.position[i] - 1 ]).toggleClass("exploded"); // Show the location for each mine

			this.dom.cheat.text( this.dom.cheat.text() == "Cheat" ? "Play" : "Cheat" ); // Toggle the applicable button label
		}
	},

	/**
	 * Save the game board state to the browser cookie
	 * 
	 * @param  Event e The event object containing a reference to this object in e.data
	 */
	save            : function() {
		
		if ( ! this.locked ) { // Ensure that the game board is not locked
			
			var cleared = []; // Store all the ids of already cleared game board squares
			
			$(".ms-board-square.cleared").each(function() { cleared.push($(this).attr("for")); }); 
			
			$.cookie("minesweeper_size", this.dom.mode.val(), { 'expires': 31, 'path': "/" });
			$.cookie("minesweeper_selected", cleared, { 'expires': 31, 'path': "/" });
			$.cookie("minesweeper_position", this.mine.position, { 'expires': 31, 'path': "/" });
			$.cookie("minesweeper_cleared", this.mine.cleared, { 'expires': 31, 'path': "/" });
			
			this.dom.save.attr("disabled", "disabled"); // Disable save
			this.dom.load.removeAttr("disabled");       // Ensure that the load button is enabled
		}
	},

	/**
	 * Load the game board
	 * 
	 * @param  Event e The event object containing a reference to this object in e.data
	 */
	load            : function() {
		
		this.create($.cookie("minesweeper_size")); // Clear the current game board
		
		this.mine.cleared = $.cookie("minesweeper_cleared").split(",").map(function(i) { return parseInt(i); });
		this.mine.position = $.cookie("minesweeper_position").split(",").map(function(i) { return parseInt(i); });
		this.mine.count = this.mine.position.length;

		var selected = $.cookie("minesweeper_selected").split(",").map(function(i) { return parseInt(i); });
		
		for ( var i in selected ) { // Mark store game board squares as cleared and 
			
			$(this.dom.square[ selected[i] - 1 ]).addClass("cleared").text( this.scan( selected[i] ) || "" ); // Clear the squares and apply radius count as applicable

			this.detected++; // Accrue the detected clearances
		}
	}	
};

/**
 * On document ready primary minesweeper entry point initializes a game board of 8 x 8
 */
$(document).ready(function() {
	
	window.Minesweeper = minesweeper.init(8);
  
});

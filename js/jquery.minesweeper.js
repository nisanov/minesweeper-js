/* 
	Document   : js/minesweeper.js
	Created on : 12-Mar-2012
	Author     : Yasha Nisanov
	Description: A Minesweeper clone written in JavaScript.
*/

var minesweeper = {
	
	size     : 8,            // Track the size of the game board
	locked   : false,        // Track the locked state of the game board
	
	mine     : {             // The mine object
		
		count    : 0,        // Track the number of mines
		position : [],       // Track the mine positions
		cleared  : []        // Track the cleared mines
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
		
		this.dom.board.on("lock", null, this, this.lock);         // Bind custom game board lock trigger
		this.dom.board.on("unlock", null, this, this.unlock);     // Bind custom game board unlock trigger		

		this.dom.create.on("click", null, this, this.create);     // Create event binds to each game element
		this.dom.validate.on("click", null, this, this.validate); // Validate the game board
		this.dom.cheat.on("click", null, this, this.cheat);       // Display the mine locations		

		this.dom.save.on("click", null, this, this.save);         // Bind the event trigger to save the game board
		this.dom.load.on("click", null, this, this.load);         // Bind the event trigger to load the saved game board state
		
		this.dom.mode.val(this.size); // Ensure that the game mode reflects the mode set in initialization
		
		this.create(); // Call to create the minesweeper board based on the requested size
		
		return this;
	},
	
	/**
	 * Create the minesweeper game board
     * @param  integer size The size of the game board grid
	 */
	create          : function(size) {

		size && size.data && $.extend(this, size.data);

		var position = 1, col = undefined, row = undefined, span = undefined
		
		this.dom.board.trigger("unlock").empty(); // Reset the locked state and empty the game board

		this.size = parseInt( isNaN(size) ? this.dom.mode.val() : this.dom.mode.val(size).val() ); // Set the size based on the game mode selected or from the initial size

		this.dom.cheat.text("Cheat"); // Ensure that the cheat button text is reset
		
		for ( col = 0; col < this.size; col++ ) { // Create for each column
			
			for ( row = 0; row < this.size; row++ ) { // Create for each row
				
				span = $('<span for="' + ( position++ ) + '" class="ms-board-square"></span>');
				
				if ( col > 0 && row == 0 ) span.addClass("row"); // Clear for a new row
				
				this.dom.board.append(span);
			}
		}
		
		// Create an internal reference to each game board square
		this.dom.square = $(".ms-board-square")
		
			.on("click", null, this, function(e) { // Process mine detection test
				
				if ( ! e.data.locked && ! $(this).hasClass("flagged") && ! $(this).hasClass("cleared") && ! $(this).hasClass("exploded") ) { // Ensure that the game board square is not locked, flagged, cleared or exploded
					
					$(this).addClass("cleared");
					
					e.data.dom.save.removeAttr("disabled"); // Enabled save
					
					if ( e.data.armed( parseInt($(this).attr("for")) ) ) { // Mine detected GAME OVER
						
						for ( var i in e.data.mine.position ) { // Explode all mine locations

							$(e.data.dom.square[e.data.mine.position[i] - 1]).toggleClass("exploded");
						}
						
						if ( confirm("GAME OVER !!!\n\nNew Game ?") ) {
							
							e.data.create();
						}
						else e.data.dom.board.trigger("lock");
					}
					else { // NO mines detected; tile cleared
						
						var detected = e.data.scan( parseInt($(this).attr("for")) );
						
						$(this).text(detected || "");
						
						if ( ! detected ) { // No mines where detected in the current radius
							
							e.data.clear( parseInt($(this).attr("for")) );
						}
					}
				}
			})
			
			.on("contextmenu", null, this, function(e) { // Toggle flag class if the game board is not locked and not already cleared
				
				if ( ! e.data.locked && ! $(this).hasClass("cleared") ) $(this).toggleClass("flagged");
				
				return false; // Bypass context menu
			});

		this.arm(); // Call to configure and arm the mines
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
		
		for ( var m = 1; m <= this.mine.count; m++  ) { // Randomly arm the mine positions
			
			this.mine.position.push( this.mine.cleared.splice( Math.floor( Math.random() * this.mine.cleared.length), 1 )[0] );
		}
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
			
			detected ? $(this.dom.square[ id - 1 ]).addClass("cleared") : $(this.dom.square[ id - 1 ]).click(); // Clear when surrounding mines otherwise perform a psuedo click to trigger a clearance of surrounding mines
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
	lock            : function(e) {
		
		if ( ! e.data.locked ) { // Ensure that the game board is infact unlocked

			e.data.dom.cheat.attr("disabled", "disabled");
			e.data.dom.validate.attr("disabled", "disabled");
			e.data.dom.save.attr("disabled", "disabled");
			
			e.data.locked = true;
		}
	},

	/**
	 * Unlock the game board
	 * 
	 * @param  Event e The event object containing a reference to this object in e.data
	 */
	unlock          : function(e) {

		if ( e.data.locked ) { // Ensure that the game board is infact locked

			e.data.dom.cheat.removeAttr("disabled");
			e.data.dom.validate.removeAttr("disabled");
			e.data.dom.save.attr("disabled", "disabled"); // Disable save because unlocking occurs during create game as save is only enabled after the first move
			
			e.data.locked = false;
		}
	},

	/**
	 * Validate the game board
	 * 
	 * @param  Event e The event object containing a reference to this object in e.data
	 */
	validate        : function(e) {

		if ( ! e.data.locked ) { // Ensure that the game board is not locked
			
			for ( var i in e.data.mine.cleared ) { // Scan all clear game board squares
				
				if ( ! $(e.data.dom.square[e.data.mine.cleared[i] - 1]).hasClass("cleared") ) { // A mine has not been cleared
					
					return ( confirm("GAME OVER !!!\n\nYou failed to clear the game board.\n\nNew Game ?") ? e.data.create() : e.data.dom.board.trigger("lock") );
				}
			}
			
			return ( confirm("CONGRATULATIONS !!!\n\nYou have successfully cleared the game board.\n\nNew Game ?") ? e.data.create() : e.data.dom.board.trigger("lock") );
		}
		
		return false;		
	},

	/**
	 * Display the mine locations
	 * 
	 * @param  Event e The event object containing a reference to this object in e.data
	 */
	cheat           : function(e) {

		if ( ! e.data.locked ) { // Ensure that the game board is not already locked
			
			for ( var i in e.data.mine.position ) $(e.data.dom.square[ e.data.mine.position[i] - 1 ]).toggleClass("exploded"); // Show the location for each mine

			$(this).text( $(this).text() == "Cheat" ? "Play" : "Cheat" ); // Toggle the applicable button label
		}
	},

	/**
	 * Save the game board state to the browser cookie
	 * 
	 * @param  Event e The event object containing a reference to this object in e.data
	 */
	save            : function(e) {
		
		if ( ! e.data.locked ) { // Ensure that the game board is not locked
			
			var cleared = []; // Store all the ids of already cleared game board squares
			
			$(".ms-board-square.cleared").each(function() { cleared.push($(this).attr("for")); }); 
			
			$.cookie("minesweeper_size", e.data.dom.mode.val(), { 'expires': 31, 'path': "/" });
			$.cookie("minesweeper_selected", cleared, { 'expires': 31, 'path': "/" });
			$.cookie("minesweeper_position", e.data.mine.position, { 'expires': 31, 'path': "/" });
			$.cookie("minesweeper_cleared", e.data.mine.cleared, { 'expires': 31, 'path': "/" });
			
			e.data.dom.save.attr("disabled", "disabled"); // Disable save
			e.data.dom.load.removeAttr("disabled");       // Ensure that the load button is enabled
		}
	},

	/**
	 * Load the game board
	 * 
	 * @param  Event e The event object containing a reference to this object in e.data
	 */
	load            : function(e) {
		
		e.data.create($.cookie("minesweeper_size")); // Clear the current game board
		
		e.data.mine.cleared = $.cookie("minesweeper_cleared").split(",").map(function(i) { return parseInt(i); });
		e.data.mine.position = $.cookie("minesweeper_position").split(",").map(function(i) { return parseInt(i); });
		e.data.mine.count = e.data.mine.position.length;

		var selected = $.cookie("minesweeper_selected").split(",").map(function(i) { return parseInt(i); });
		
		for ( var i in selected ) { // Mark store game board squares as cleared and 
			
			$(e.data.dom.square[ selected[i] - 1 ])
				.addClass("cleared")                       // Clear the square
				.text( e.data.scan( selected[i] ) || "" ); // Apply radius count as applicable
		}
	}	
};

/**
 * On document ready primary minesweeper entry point initializes a game board of 8 x 8
 */
$(document).ready(function() {
	
	window.Minesweeper = minesweeper.init(8);
  
});

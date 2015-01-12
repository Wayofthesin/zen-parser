/** Copyright (c) 2014 WaY **/

// $TODO:
//		+ Add toHTML function - toHTML() method of elem
//		+ Add toDOM function - toDOM() method of elem (check and test this method of zen.Elem)
//		- Add zen_at field to the error details.
//		- Convert tabs to spaces
//		- Remove security instructions in private called functions
//		- "Readed" how could I do dat...

var zen = (function(){
	  //Elements to be publiced and reachable from out of this namespace
	var public 			= {};
	
	public.options 		= {
		  //If true errors will be returned instead of thrown
		return_errors:		   false,
	
		  //if true multiplied objects will be single-instance
		  //referenced many times. This option should be turned of 
		  //if we want to set different field values for multiplied
		  //elements we have to set this option to false.
		  // NOTICE!!
		  //If you enable this option multipled elements enumeration by '%' sign will be disabled!
		multiply_by_reference: false,
	};
	
	
	
	/* ******************************************
	 * Definition of characters with special meaning in script.
	 *   special_chars - characters that are used to signify
	 *					 attributes or relations.
	 *	 white_spaces  - characters to be ignored by script.
	 *					 They can break words.
	 *	 word_chars	   - characters that could be part of word.
	*********************************************/
	var special_chars 			= "$#.[]+>(){}^%";
	var white_spaces  			= " \t\r\v\n\f";
	var word_chars	  			= "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890%_-\\";
	var digits		  			= "1234567890";
	var number_negation			= "-";
	var enum_char				= "%";
	var special_char_indicator	= "\\";
	
	
	/* ******************************************
	 * Void HTML elements are elements that do not have end tag.
	 * every void element has oppening tag but CANNOT (since HTML5)
	 * have ending tag
	*********************************************/
	var void_tags = [
			"area", "base", "br", "col", "command",
			"embed", "hr", "img", "input", "keygen",
			"link", "meta", "param", "source", "track","wbr"
	];
	
	
	
	var HtmlEntry =
	function( elem, name ) {
		if( !(this instanceof HtmlEntry) )
			return new HtmlEntry(elem, name);

		this.elem 		= elem;
		this.name	 	= name;
		this.children	= [];
	};
	
	
	
	  //This is result of parsing zen syntax. Array of this elements will be returned as a result.
	  //Each script using zen parser can decide how to use/create parsed elements.
	  //<br/> is also an element!
	var Elem 	=
	function( tag ){
	
		  //Element tag like "body", "a", "b", "br". Custom tags are acceptable!
		this.tag 		= tag;
		
		  //If true element is void what means it's unclosing element (like input or br)
		this.is_void		= is_void_element( this.tag );
		
		  //Name of element - content after $ sign without '$'.
		  //This should be intuitive name for easy usage. Can be ignored in some implementations.
		  //This is for internal use in some implementations. Look at HTML generator example for
		  //great opportunity this operator creates. It's used in Component Base Application to 
		  //make easy element references. It's not taken from element id because it could repeat in
		  //multiple object instances (every  photo in gallery could have "FRAME" $ name).
		this.$			= "";
		
		  //The text inside an element a[href=#]{This is element text!}
		  //<br/> will be parsed as part of an text if we write:
		  //  span{first line<br/>second line}
		  //the text value will be exactly EQUAL to:
		  //  "first line<br/>second line"
		  //NOT:
		  // "first line\nsecond line"
		  //this is because html apply \n only between <pre> tags.
		  //check out element.insertAdjacentHTML to proper insert text containing html tags
		  //but please do not use it to other adjustments than text modifiers.
		this.text		= "";
		
		  //Attributes of element written as: {name: value}.
		  //id and class are attributes and will be placed in here.
		this.attr		= {}
		
		  //Array of Elem instances.
		this.children	= [];
		
		return this;
	};
	
	Elem.prototype.addAttribute =
	function( name, value ) {
		if( is_array(name) ) {
			if( name.length != value.length ) //if value isn't array value.length isn't defined
				throw new Error( "Invalid values passed to Elem.addAttribute! arguments: "+JSON.stringify(arguments) );
				
			var n=name.length;
			while( n-- )
				this.attr[name[n]] = value[n] || "";
				
			return;
		}
		
		if( typeof name !== "string" || typeof value !== "string" )
			throw new Error( "Invalid values passed to Elem.addAttribute! arguments: "+JSON.stringify(arguments) );
			
		this.attr[name] = value || "";

	};
	
	Elem.prototype.removeAttribute = 
	function( name ) {
		if( is_array(name) ) {
			for( var n in name )
				delete this.attr[ name[n] ];
				
			return;
		}
		
		if( typeof name !== "string" )
			throw new Error( "Invalid values passed to Elem.removeAttribute! arguments: "+JSON.stringify(arguments) );
	
		delete this.attr[name];
	};
	
	Elem.prototype.addChild = 
	function( child ) {
		if( child instanceof ElemStack )
			child = child.elems;
		
		if( !is_array(child) )
			child = [child];
	
		for( var i in child )
			this.children.push( child[i] );
	};
	
	Elem.prototype.toHTML = 
	function( skip_childs /*if true any of children will be proceeded to html*/, indent ) {
		var result = "";
	
		if( !indent )
			indent = 0;
	
		  //Firstly we have to indent our code as in param given
		for( var i=0; i<indent; ++i )
			result += "\t";
		
		  //Add html element with attributes like "<body bgcolor="#afafaf">
		result += "<" + this.tag + " ";
		result += html_attr_list( this.attr );
		
		  //We have to remember to close void elements for XHTML compatibility
		if( this.is_void )
			result += "/";
		
		result += ">";
		
		  //Print internal javascript identifier for debugging purposes
		if( this.$ )
			result += "<!-- identified as: " + this.$ + " -->";
			
		  //Add element text before the children for easy read
		if( this.text )
			result += this.text;
			
		  //Not that void element cannot have children so the part inside this
		  //condition have no sense for them. The void elements children containment
		  //is tested in parse phase.
		if( !this.is_void ) {
			if( !skip_childs ) {
				var children 	= this.children;
				var n 			= children.length;
				
				  //Start new line for first child. While current element isn't closed
				  //we didn't start new line yet.
				if( n )
					result += "\n";
				
				
				  //Now we have to parse every child like an element using current function.
				  //Note that we have to increase indent couse our child need additional tab
				  //for beauty alignment.
				for( var i=0; i<n; ++i ) {
					result += children[i].toHTML( false, indent+1 );
				}
				
				  //If we had some children our ending tag is placed in another line
				  //so we have to indent it.
				if( n ) {
					for( var i=0; i<indent; ++i )
						result += "\t";
				}
			}
			
			  //At the end we have to print ending tag.
			  //Note that it's placed inside of void element condition
			  //but outside of skip_childs condition.
			  //This is because we don't want to close void elements.
			  //but not void elements with child parse disabled still
			  //have to be closed.
			result += "</" + this.tag + ">\n";
		}
		
		return result;
	};
	
	Elem.prototype.toDOM = 
	function(
		skip_childs 	/*if true any of children will be proceeded to html*/,
		id_field_name 	/*name of field that will store element id (the value of $ element field).
						  Any other value than string will be ignored*/
	) {
		var result = document.createElement( this.tag );
		
		if( this.text )
			result.appendChild( document.createTextNode(this.text) );
			
		for( var name in this.attr )
			result[(name == "class" ? "className" : name)] = this.attr[name];
			
		if( typeof id_field_name == "string" )
			result[id_field_name] = this.$;
			
		if( !skip_childs && this.children.length ) {
			var n = this.children.length;
			for( var i=0; i<n; ++i ) {
				result.appendChild( this.children[i].toDOM(skip_childs, id_field_name) );
			}
		}
			
		return result;
	}
	
	
	
	  //ElemStack won't be returned to simplify usage of an element and avoid
	  //problems when user mistakenly add attribute to all of the elements.
	  //All ElemStack methods (except push) are applied to all of the elems on the stack.
	var ElemStack = 
	function(){
		this.elems	= [];

		this.pop    = this.elems.pop.bind( this.elems );
		
		return this;
	};
	
	ElemStack.prototype.addAttribute = 
	function( name, value ) {
		for( var i in this.elems )
			this.elems[i].addAttribute(name, value); //validation in there
	};
	
	ElemStack.prototype.removeAttribute = 
	function( name ) {
		for( var i in this.elems )
			this.elems[i].removeAttribute(name); //validation in there
	}
	
	ElemStack.prototype.addChild = 
	function( child ) {
		for( var i in this.elems )
			this.elems[i].addChild(child); //validation in there
	}
	
	ElemStack.prototype.push = 
	ElemStack.prototype.push_array = 
	function() {
		for( var i in arguments ) {
			if( arguments[i] instanceof Elem )
				this.elems.push( arguments[i] );
			else if( arguments[i] instanceof ElemStack )
				this.elems.push.apply( this.elems, arguments[i].elems );
			else if( is_array(arguments[i]) )
				this.elems.push.apply( this.elems, arguments[i] );
			else
				throw new Error("Invalid value delivered to ElemStack.push method!");
		}
	}
	
	ElemStack.prototype.toHTML =
	function() {
		var n	   = this.elems.length;
		var html   = "";
			
			
		for( var i=0; i<n; ++i )
			html += this.elems[i].toHTML();
		
		return html;
	}
	

	
	public.parse = 
	function( abbr /*abbreviation in zen syntax*/ ) {
		try {
			var result = parse_group( abbr, 0, 0 );
			return result.result.elems;
		}
		catch( error ) {
			if( public.options.return_errors )
				return error;
			else
				throw error;
		}
	};	
	
	public.toHTML =
	function( abbr /*abbreviation in zen syntax*/ ) {
		try {
			return parse_group( abbr, 0, 0 ).result.toHTML();
		}
		catch( error ) {
			if( public.options.return_errors )
				return error;
			else
				throw error;
		}
	};
	
	
	
	
	function parse_group( abbr, index, nest ) {
		var result			= new ElemStack(); //topmost elements
		var enumerated		= null;
		var elem_stack 		= new ElemStack();
		var last_elem		= null; //this is easy reference to last elem on the stack
		var curr_elem  		= null;
		var group			= false;
		var readed_text 	= "";
		var readed_word		= {};
		var readed_number	= {};
		var attributes		= {};
	
		var n = abbr.length;
		var i = index;
		while( i<n ) {
			if( !curr_elem && abbr[i] != "(" ) {
				  //skip whitespace and read tag. throws error if tag is empty
				var readed_word = read_word( abbr, i );
				
				if( !readed_word.result )
					throw new Error("Cannot read tag! Expected a word! At "+i+" in \""+abbr+"\"!");
				
				curr_elem = new Elem( readed_word.result );
				group = false;
				
				i = readed_word.end_index;
				
				  //If abbreviation ends with tag
				if( i>= n )
					break;
			}
			else {
				i = skip_whitespaces(abbr, i);
			}
			
			switch( abbr[i] ) {	
				//ATTRIBUTES
				case '$': {  //READ MORE!
					  //This is the only different of zen coding syntax.
					  //In case of component based application $ sign is
					  //special component internal identifier. Elements with
					  //internal identifier can be accessed from elems object.
					  //
					  //  element:
					  //    div.container $content
					  //  can be accessed from:
					  //    elems["content"]
					  
					++i;
					readed_word = read_word( abbr, i );
					
					if( !readed_word.result )
						throw new Error("Cannot read internal identifier! Expected a word! At "+i+" in \""+abbr+"\"!");
						
					curr_elem.$ = readed_word.result;
					i = readed_word.end_index;
				}
				break;
					
				case '#': { //ID
					++i;
					readed_word = read_word( abbr, i );
					
					if( !readed_word.result )
						throw new Error("Cannot read id! Expected a word! At "+i+" in \""+abbr+"\"!");
						
					curr_elem.addAttribute( "id", readed_word.result );
					i = readed_word.end_index;
				}
				break;
					
				case '.': { //Class
					++i;
					readed_word = read_word( abbr, i );
					
					if( !readed_word.result )
						throw new Error("Cannot read internal identifier! Expected a word! At "+i+" in \""+abbr+"\"!");
						
					curr_elem.addAttribute( "class", readed_word.result );
					i = readed_word.end_index;
				}
				break;
				
				case '[': { //Custom attributes
					++i;
					attributes = parse_attrs(abbr, i);
					for( var attr in attributes.result )
						curr_elem.addAttribute( attr, attributes.result[attr] );
						
					i = attributes.end_index;
				}
				break;
				
				case ']': { //End of custom attributes
					  // ']' should be skipped by parse_attrs called just after '['
					throw new Error("Parser error! Reached ']' without opening one! At "+i+" in \""+abbr+"\"!");
				}
				break;
				
				//RELATIONS
				case '+': { //Sibling
					  //Current element was a child of last element on the stack or should be placed in top_most array
					//the next elem is sibling so we didn't place current elem on the array!
					
					if( last_elem )
						last_elem.addChild( curr_elem );
					else
						result.push_array( curr_elem );
					
					curr_elem = null;
					++i; //skip '+' sign
				}
				break;
				
				case '>': { //Child
					  //save current elem and if it's not a group put it on the stack					
					if( last_elem )
						last_elem.addChild( curr_elem );
					else
						result.push_array( curr_elem );
					
					if( curr_elem.is_void )
						throw new Error( "Void HTML element cannot have children! At " + i + " in \""+abbr+"\"!" );
					
					if( !group ) {
						elem_stack.push( last_elem=curr_elem );
						curr_elem = null;
					}
					
					++i; //skip '>' sign
				}
				break;
				
				case '^': { //Level up
					  //Curr element parsed
					if( last_elem )
						last_elem.addChild( curr_elem );
					else
						result.push_array( curr_elem );
					
					curr_elem = null;

					  //Pop last elements from the stack till the last occurence of '^'. Ignore all whitespaces
					while( abbr[i] == '^' || is_white_space(abbr[i]) ) {
						if( abbr[i] == '^' ) {
							if( !last_elem )
								throw new Error("Unexpected climb-up operator! Cannot climb-up while on top level! At "+i+" in \""+abbr+"\"!");
							
							elem_stack.pop();
							elem_stack.push(last_elem=elem_stack.pop()); //get last elem
						}
						
						++i;
					}
				}
				break;
				
				case '(': { //Group
					  //if curr_elem exists that's mean that abbreviation didn't specified
					  //how to place group: div.id( => ERROR!
					
					if( curr_elem )
						throw new Error("Unexpected '(' at "+i+" in \""+abbr+"\"!");
					
					++i; //skip '(' sign
					var group = parse_group(abbr, i, nest+1);
					i = group.end_index;
					
					curr_elem = group.result;
					group = true; //block adding childs
				}
				break;
				
				case ')': { //End of group
					if( nest == 0 )
						throw new Error("Unexpected ')' at "+i+" in \""+abbr+"\"!");
					
					if( curr_elem ) {
						if( last_elem )
							last_elem.addChild( curr_elem );
						else
							result.push_array( curr_elem );
					}
						
					++i; //skip ')' sign.
					return {end_index: i, result: result};
				}
				break;
				
				//MISC
				case '{': { //Text
					++i;
					var readed_text = parse_text( abbr, i );
					curr_elem.text = readed_text.result;
					
					i = readed_text.end_index;
				}
				break;
				
				case '}': { //End of text
					  // ']' should be skipped by read_text called just after '{'
					throw new Error("Parser error! Reached '}' without opening one! At "+i+" in \""+abbr+"\"!");
				}
				
				case '*': { //Multiplier
					++i; //skip '*' sign
					
					readed_number = read_number( abbr, i );
					if( readed_number.result <= 0 )
						throw new Error("Expected a positive number at "+i+" in \""+abbr+"\"!");
					
					i = readed_number.end_index;
					
					
					enumerated = new ElemStack();
					
					if( public.options.multiply_by_reference ) {
						for(var k=0; k<readed_number.result; ++k) {
							enumerated.push_array( curr_elem );
						}
					} else {
						for(var k=0; k<readed_number.result; ++k) {
							enumerated.push_array( enumerate(curr_elem,k) );
						}
					}
					
					
					curr_elem = enumerated;
				}
				break;
				
				default: {
					throw new Error("Unexpected zen identifier at "+i+" in \""+abbr+"\"!");
				}
			}
		}
		
		if( nest !== 0 )
			throw new Error("Unexpected end of abbreviation in \""+abbr+"\"!");
		
		if( curr_elem ) {
			if( last_elem )
				last_elem.addChild( curr_elem );
			else
				result.push_array( curr_elem );
		}
		
		return {end_index: -1, result: result};;
	}
	
	  //Swap '%' signs with enumeration number
	function enumerate(elem, index) {
		var regex 		= /([^%])%([^%])/g;
		var regex_end 	= /([^%])%$/g; //To match % at the end of the string
		var regex_begin = /^%([^%])/g; //To match % at the begin of the string
		var copy  		= null;
		var result		= new ElemStack();
	
		if( elem instanceof ElemStack )
			elem = elem.elems;
	
		if( !is_array(elem) )
			elem = [elem];
	
		for( var i in elem ) {
			copy 			= new Elem( elem[i].tag );
			copy.$			= swap_non_special_chars( elem[i].$   , enum_char, ""+(index+1) );
			copy.text		= swap_non_special_chars( elem[i].text, enum_char, ""+(index+1) );
			
			if( elem[i].children.length )
				copy.children	= enumerate( elem[i].children, index ).elems;
			
			for( var j in elem[i].attr ) {
				copy.attr[j] = swap_non_special_chars( elem[i].attr[j], enum_char, ""+(index+1) );
			}
			
			result.push( copy );
		}
		
		return result;
	}
	
	  //swaps every single character occurence into new character.
	  //beside this swaps every double character occurence into single occurence.
	  // e.g.:
	  //    swap_single_char_occur( "% beer contains 6%% of alcochol", "%", "a")
	  //will result with:
	  //    "a beer contains 6% of alcochol"
	function swap_non_special_chars( string, source_char, new_char ) {
		var n		= string.length;
		var result	= "";
		
		for( var i=0; i<n; ++i ) {
			switch( string[i] ) {
				case special_char_indicator: {
					if( i < (n-1) && string[i+1] == source_char ) {
						result += source_char;
						++i;
					} else {
						result += special_char_indicator;
					}
				} break;
				case source_char: {
					result += new_char;
				} break;
				default: {
					result += string[i];
				}
			}
		}
		
		return result;
	}
	
	
	  //WARNING: This automaticaly skips whitespaces before and after the word!
	function read_word( abbr, index, allow_quotes/*=false*/ ) {
		if( allow_quotes )
			return _read_word_with_quotes( abbr, index );
		else
			return _read_word_no_quote( abbr, index );
	}
	function read_number( abbr, index ) {
		var number 	= "";
		var negated = false;
		var n	 	= abbr.length;
		var ch;
		
		index = skip_whitespaces(abbr, index);
		
		if( abbr[index] == number_negation ) {
			negated = true;
			++index;
		}
		
		//while character exists and is digit, number variable is extended by character
		while( index<n && is_digit(ch=abbr[index]) ) {number+=ch; ++index;}
		
		index  = skip_whitespaces(abbr, index);
		number = parseInt( number );
		
		if( isNaN(number) )
			throw new Error("Invalid number value at "+index+" in \""+abbr+"\"!");
		
		if( negated )
			number = -number;
		
		return {result: parseInt(number), end_index: index};
	}
	
	  //those functions can be accessed only from read_word function
	  //It was splitted into two functions to simplify usage and make
	  //clear all the situations when we ignore quotes.
	function _read_word_no_quote( abbr, index ) {
		var word = "";
		var n	 = abbr.length;
		var ch;
		
		index = skip_whitespaces(abbr, index);
			
		//while character exists and is part of word, word variable is extended by character
		while( index<n && is_word_char(ch=abbr[index]) ) {word+=ch; ++index;}
		
		index = skip_whitespaces(abbr, index);
		return {result: word, end_index: index};
	}
	function _read_word_with_quotes( abbr, index ) {
		var word 	= "";
		var n	 	= abbr.length;
		var quoted	= false; //did we met '
		var dquoted	= false; //did we met "
		var ch;
		
		index = skip_whitespaces(abbr, index);
			
		//while character exists and is part of word, word variable is extended by character
		while( index<n && quoted || dquoted || is_word_char(ch=abbr[index]) ) {
			if( !quoted && abbr[index]=='"' )
				dquoted = !dquoted;
				
			if( !dquoted && abbr[index]=='\'' )
				quoted = !quoted;
			
			word+=ch;
			++index;
		}
		
		index = skip_whitespaces(abbr, index);
		return {result: word, end_index: index};
	}
	
	
	function parse_attrs( abbr, index ) {
		var n			= abbr.length;
		var result 		= {};
		var attr		= "";
		var val			= "";
		var readed_word	= {};
		
		index = skip_whitespaces(abbr, index);
		
			//Single loop attempt to read whole pair attribute=value and skipes whitespaces
		while( index<n && abbr[index] != ']' ) {
			readed_word = read_word( abbr, index, true );
			if( !(attr=readed_word.result) )
				throw new Error("Invalid attributes list! Expected an attribute name at "+index+" in \""+abbr+"\"!");
			
			index = readed_word.end_index;
			
			if( abbr[index] != '=' ) { //if there is no value
				result[attr] = "";
				continue;
			}
			++index; //skip '=' sign
				
			readed_word = read_word( abbr, index, true );
			if( !(val=readed_word.result) )
				throw new Error("Invalid attributes list! Expected an attribute value at "+index+" in \""+abbr+"\"!");
			
			index = readed_word.end_index;
			result[attr] = val;
		}
		
		  //skip ']' sign
		if( abbr[index]!=']' )
			throw new Error("Invalid attributes list! \']\' Cannot be found at "+index+" in \""+abbr+"\"!");
		
		++index;
		
		return {result: result, end_index: index};
	}
	function parse_text( abbr, index ) {
		var result 	= "";
		var n		= abbr.length;
		
		while( index<n ) {
			if( abbr[index] == "}" && (index==0 || abbr[index-1] != "\\") ) {
				break;
			}
			
			result += abbr[index];
			++index;
		}
		
		if( abbr[index] != "}" )
			throw new Error("End of text ('}') cannot be found at "+index+" in \""+abbr+"\"!");
		
		++index; //skip '}' sign
		
		return {end_index: index, result: result};
	}
	
	  //Results with index after all whitespaces in a row
	function skip_whitespaces( abbr, index ) {
		var n=abbr.length;
		while( index<n && is_white_space(abbr[index]) ) ++index;
		
		return index;
	}
	
	function is_special_char( ch ) {
		return (special_chars.indexOf(ch) != -1);
	}
	function is_white_space( ch ) {
		return (white_spaces.indexOf(ch) != -1);
	}
	function is_word_char( ch ) {
		return (word_chars.indexOf(ch) != -1);
	}
	function is_digit( ch ) {
		return (digits.indexOf(ch) != -1);
	}
	
	function is_void_element( tag ) {
		var n = void_tags.length;
		
		for( var i=0; i<n; ++i ) {
			if( tag == void_tags[i] )
				return true;
		}
		
		return false;
	}
	
	function is_array( target ) {
		return (Object.prototype.toString.call( target ) === '[object Array]');
	}
	
	
	function html_attr_list( attrs ) {
		var result = "";
		var first  = true;

		for( var name in attrs ) {
			if( first ) {
				result += " ";
				first = false;
			}

			result += name + "=" + "\"" + attrs[name] + "\" ";
		}

		return result;
	}
	
	return public;
})();

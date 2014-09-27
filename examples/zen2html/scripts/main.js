(function() {

//Initialize elements list
var $convertButton 	= $("#convert_button");
var $inputBox		= $("#zen_input");
var $outputBox		= $("#html_output");

//Disable output box not to accept any text
$outputBox.attr("disabled", true);

$convertButton.on("click", function(){
	try {
		var result = zen.parse( $inputBox.val() );
		/*
			If no error occured result is an array of objects with structure
			{
				tag 		- element tag
				$			- element name to use in javascript
				text		- text inside the element
				attr		- {attr_name: attr_value} pairs object
				children	- array of element children. Each child is instance of presented object.
			}
		*/
		
		$outputBox.val( build_html_code(result) /*It does exactly the same what zen.toHTML( $inputBox.val() )*/ );
	}
	catch( e ) {
		$outputBox.val( e.message );
	}
});



  //This function builds html code from the zen parser result.
function build_html_code( elems_tree /*elements array*/) {
	var n 		= elems_tree.length,
		result = "";
	
	//Simply iterate trough elements and create html code from each
	for( var i=0; i<n; ++i ) {
		result += build_html_from_elem( elems_tree[i], 0 );
	}
	
	return result;
}

  //Creates html code of single element
function build_html_from_elem ( elem   /*current element*/, indent /*current text indent*/ ) {
	var result = "";

	  //Firstly we have to indent our code as in param given
	for( var i=0; i<indent; ++i )
		result += "\t";
	
	  //Add html element with attributes like "<body bgcolor="#afafaf">
	result += "<" + elem.tag;
	result += build_attr_list( elem.attr );
	
	  //We have to remember to close void elements for XHTML compatibility
	if( elem.is_void )
		result += "/";
	
	result += ">";
	
	  //Print internal javascript identifier for debugging purposes
	if( elem.$ )
		result += "<!-- identified as: " + elem.$ + " -->";
		
	  //Add element text before the children for easy read
	if( elem.text )
		result += elem.text;
		
	  //Not that void element cannot have children so the part inside this
	  //condition have no sense for them. The void elements children containment
	  //is tested in parse phase.
	if( !elem.is_void ) {
		var children 	= elem.children;
		var n 			= children.length;
		
		  //Start new line for first child. While current element isn't closed
		  //we didn't start new line yet.
		if( n )
			result += "\n";
		
		
		  //Now we have to parse every child like an element using current function.
		  //Note that we have to increase indent couse our child need additional tab
		  //for beauty alignment.
		for( var i=0; i<n; ++i ) {
			result += build_html_from_elem( children[i], indent+1 );
		}
		
		  //If we had some children our ending tag is placed in another line
		  //so we have to indent it.
		if( n ) {
			for( var i=0; i<indent; ++i )
				result += "\t";
		}
		
		  //At the end we have to print ending tag.
		  //Note that it's placed inside of void element condition.
		  //This is because we don't want to close void elements.
		result += "</" + elem.tag + ">\n";
	}
	
	return result;
}

  //Simply converts {name: key} like object into the "name="value"" like string
function build_attr_list( attrs ) {
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

})();
"use strict";
(function() {
	var decimalPressed = false;
	
	var dataBuffer = ""; //this is updated as the user presses the buttons on the calculator. flushBuffer() is only done on some buttons!
	var arrayBuffer = [];
	var equations = [];
	var stateMachines = [];
	
	function buttonIsNumber(button){ if(!isNaN(button.symbol)){ return true; } return false; }
	
	//flushBuffer() properly adds the the numbers or operators to the arrayBuffer
	function flushBuffer(){
	    var result = "";
        if(dataBuffer == ""){ return; }
        if(!isNaN(dataBuffer)){ //this is a number, parse it as so
            result = parseFloat(dataBuffer);
        }else{ //this is a string (likely an operator)
            result = dataBuffer;
        }
        arrayBuffer.push(result);
        dataBuffer = "";
	}
	function clearEverything(){
	    document.getElementById("equation").innerHTML = "";
		document.getElementById("answer").innerHTML = "";
		decimalPressed = false;
		dataBuffer = "";
		arrayBuffer = [];
		stateMachines = [];
		equations = [];
	}
	function sweepViaParenthesis(arrayBufferClone,res){
	    res.done = true;
	    var leftParenthesisIndex = 0, rightParenthesisIndex = 0;
		var firstEquation = {}, secondEquation = {};
		for(var i = 0; i < arrayBufferClone.length; i++){
		    if(arrayBufferClone[i] == "("){ leftParenthesisIndex = i; }
		}
		for(var i = 0; i < arrayBufferClone.length; i++){
		    if(arrayBufferClone[i] == ")" && i > leftParenthesisIndex){ rightParenthesisIndex = i;  break; }
		}
		//seperate this arraybuffer into two
		if(leftParenthesisIndex != 0 || rightParenthesisIndex != 0){
			var newArrayBuffer = []
			for(var j = leftParenthesisIndex+1; j < rightParenthesisIndex; j++){
				newArrayBuffer.push(arrayBufferClone[j]);
			}
			secondEquation.array = newArrayBuffer;
			secondEquation.name = "eq" + res.index;
			secondEquation.result = 0;
			res.index++;
			equations.push(secondEquation);
			
			var numToRemove = (rightParenthesisIndex - leftParenthesisIndex) + 1;
			arrayBufferClone.splice(leftParenthesisIndex,numToRemove,secondEquation.name);
		}
		//check for any more parenthesis
		for(var j = 0; j < arrayBufferClone.length; j++){
			if(arrayBufferClone[j] == "(" || arrayBufferClone[j] == ")"){
				res.done = false;
			}
		}
		if(res.done == false){
		    sweepViaParenthesis(arrayBufferClone,res);
		}else{
			firstEquation.array = arrayBufferClone;
			firstEquation.name = "eq" + res.index;
			firstEquation.result = 0;
			res.index++;
			equations.push(firstEquation);
		}
	}
	function replaceEquationSqrtWithNumber(eqArray){
	    for(var i = 0; i < eqArray.length; i++){
		    var element = eqArray[i];
			if(element == "R"){
			     var num = eqArray[i+1];
				 if(Math.sign(num) == -1){
				     return false;
				 }
			     var res = Math.sqrt(num);
				 eqArray.splice(i,2,res);
				 
				 if(eqArray.length > 1){
				     if(eqArray[i-1] == "-"){
					     if(eqArray.length > 2){
						     if(eqArray[i-2] != "-" && !isNaN(eqArray[i-2])){
							     return true;
							 }
						 }
					     eqArray.splice(i-1,2,-res);
					 }
				 }
			}
		}
		return true;
	}
	function replaceEquationResultWithAnswer(eqArray){
	    for(var i = 0; i < eqArray.length; i++){
		    var element = eqArray[i];
			if (typeof element === 'string' || element instanceof String){
				if(element.search("eq") != -1){
					for(var j = 0; j < equations.length; j++){
					    if(equations[j].name == element){
						    eqArray[i] = equations[j].result;
						}
					}
				}
			}
		}
	}
	function sweepUsingPEMDAS(arrayBufferClone,operator,operator2){
		for(var i = 0; i < arrayBufferClone.length; i++){
			if(isNaN(arrayBufferClone[i]) && ((operator !== undefined && arrayBufferClone[i] == operator) || (operator2 !== undefined && arrayBufferClone[i] == operator2))){
				var result = 0;		
				if(operator == "^" && arrayBufferClone[i] == "^"){ result = Math.pow(arrayBufferClone[i-1],arrayBufferClone[i+1]); } //exponent
				else if(  (operator == "x") && (operator2 == "/")){ //Multiply & Divide
					if(operator == "x" && arrayBufferClone[i] == "x"){ result = arrayBufferClone[i-1] * arrayBufferClone[i+1]; }
					else if(operator2 == "/" && arrayBufferClone[i] == "/"){ 
						if(arrayBufferClone[i+1] == 0){
							arrayBufferClone.splice(i-1, 3, "Error: Divide by 0"); return "Error: Divide by 0";
						}
						result = arrayBufferClone[i-1] / arrayBufferClone[i+1]; 
					}
				}
				else if(operator == "%" && arrayBufferClone[i] == "%"){ result = arrayBufferClone[i-1] % arrayBufferClone[i+1]; } //Modulo
				else if(  (operator == "+") && (operator2 == "-")){ //Add & Subtract
					if(operator == "+" && arrayBufferClone[i] == "+"){ result = arrayBufferClone[i-1] + arrayBufferClone[i+1]; }
					else if(operator2 == "-" && arrayBufferClone[i] == "-"){ result = arrayBufferClone[i-1] - arrayBufferClone[i+1]; }
				}		
				arrayBufferClone.splice(i-1, 3, result);
			}
		}
		return true;
	}
	function solveEquation(equationString){
	    flushBuffer();
		var copyOfArrayBuffer = arrayBuffer.slice(0); //its safer to just work with a copy of the arrayBuffer incase we need the unmodified original one for something later
		
	    if(equationString == "" || copyOfArrayBuffer.length == 0){ //this is just an easy way to check if there was no equation to start with, then we simply solve as zero
		    document.getElementById("answer").innerHTML = "0";
			equations = [];
			return 0;
		}
		if(copyOfArrayBuffer.length == 1 && !isNaN(copyOfArrayBuffer[0])){ //if there was only one element in the array buffer (and if its a number,) then return that
			document.getElementById("answer").innerHTML = copyOfArrayBuffer[0].toString();
			equations = [];
			return copyOfArrayBuffer[0];
		}
		//split copyOfArrayBuffer into several equations because of parenthesis
		var res = { index: 0, done: true, };
		sweepViaParenthesis(copyOfArrayBuffer,res); 

		//now equations is properly populated.
		for(var j = 0 ; j < equations.length; j++){
		    var equationCopy = equations[j].array;
		    replaceEquationResultWithAnswer(equationCopy);  //replace equation names with their results

			var sqRes = replaceEquationSqrtWithNumber(equationCopy);
			if(sqRes == false){
			    document.getElementById("answer").innerHTML = "Error"; equations = []; return 0;
			}
			if(equationCopy.length == 1){
			    equations[j].result = equationCopy[0]; continue;
			}
			var r = true;
			while(equationCopy.length > 1){
				//sweep using PEMDAS
				r = sweepUsingPEMDAS(equationCopy,"^")     //Exponent
				r = sweepUsingPEMDAS(equationCopy,"x","/") //Multiply & Divide
				if(r !== true){
					document.getElementById("answer").innerHTML = r.toString();
					equations = [];
				    return r;
				}
				r = sweepUsingPEMDAS(equationCopy,"%")     //Modulo (modulo isnt a part of normal PEMDAS, but what the hell)
				r = sweepUsingPEMDAS(equationCopy,"+","-") //Add & Subtract
			}
			//were done, the final answer is the last operation in the equationCopy
			equations[j].result = equationCopy[equationCopy.length-1];
		}
		var res = equations[equations.length-1].result;
		document.getElementById("answer").innerHTML = res.toString();
		equations = [];
		return res;
	}
	function isEquationValidForSolve(){
	    //check for equal number of left and right parenthesis
		var leftCount = 0, rightCount = 0;
		for(var i = 0; i < arrayBuffer.length; i++){
		    if(arrayBuffer[i] == "("){ leftCount++; }
			else if(arrayBuffer[i] == ")"){ rightCount++; }
		}
		if(rightCount != leftCount){
		    return false;
		}
		return true;
	}
	function insertNegative(){
	    document.getElementById("equation").innerHTML += "&#8208;";
		dataBuffer += "-"
	}
	function insertSqRoot(){    
	    document.getElementById("equation").innerHTML = document.getElementById("equation").innerHTML + " &#8730; ";
		decimalPressed = false;
		flushBuffer();
		dataBuffer = "R"
		flushBuffer();
		insertLeftParen();
	}
	function insertSubtract(){
	    document.getElementById("equation").innerHTML = document.getElementById("equation").innerHTML + " &#8211; ";
		decimalPressed = false;
		flushBuffer();
		dataBuffer = "-"
		flushBuffer();		
	}
	function insertLeftParen(){
	    document.getElementById("equation").innerHTML += "(";
		flushBuffer();
		dataBuffer = "("
		flushBuffer();	
	}
	function insertRightParen(){
	    document.getElementById("equation").innerHTML += ")";
		flushBuffer();
		dataBuffer = ")"
		flushBuffer();	
	}
	function insertDecimal(){
	    document.getElementById("equation").innerHTML += ".";
		decimalPressed = true;
		dataBuffer += ".";
	}
	function insertNumber(symbol){
	    document.getElementById("equation").innerHTML += symbol;
        dataBuffer += symbol;
	}
	function insertOperator(symbol){
	    document.getElementById("equation").innerHTML = document.getElementById("equation").innerHTML + " " + symbol + " ";
		decimalPressed = false;
		flushBuffer();
		dataBuffer = symbol
		flushBuffer();
	}		
	function userClicked(button){	
	    var currentMachine = {}, previousMachine = undefined;
		if(stateMachines.length > 0){
		    previousMachine = stateMachines[stateMachines.length-1];
		}
		currentMachine.button = button;
		currentMachine.symbol = button.symbol;
		currentMachine.answer = undefined; //really a misc property...
		
		// condition: clearing will always have priority
		if(button.symbol == "Clear"){
		    clearEverything();
			return;
		}
		if(button.symbol == "CE"){
		    if(stateMachines.length <= 1){
			    clearEverything();
				return;
			}
			var buttonsCopy = [];
			for(var t = 0; t < stateMachines.length-1; t++){
			    buttonsCopy.push(stateMachines[t].button);
			}
			clearEverything();
			for(var t = 0; t < buttonsCopy.length; t++){
				userClicked(buttonsCopy[t]);
			}
			return;
		}
		// condition: if this is the first state, make sure it is a number only, or equals button that solves for zero,
		//or the subtract button which will insert a negative, or the sqrt button, or the left parenthesis
		if(stateMachines.length == 0){
		    if(buttonIsNumber(button) == true){ //insert number
			    insertNumber(button.symbol);
				stateMachines.push(currentMachine);
			}else if(button.symbol == "="){ //solve equation as zero
			    currentMachine.answer = solveEquation("");
				stateMachines.push(currentMachine);
			}else if(button.symbol == "-"){ //insert negative
			    insertNegative();
				currentMachine.answer = "NEGATIVE_PRESSED";
				stateMachines.push(currentMachine);
			}else if(button.symbol == "R"){ //sqrt
			    insertSqRoot();
				stateMachines.push(currentMachine);
			}else if(button.symbol == "("){ //left parenthesis
			    insertLeftParen();
				stateMachines.push(currentMachine);
			}
        }else{
		    //condition for left parenthesis: can only be placed after an operator, or after itself
			if(button.symbol == "(" && (previousMachine.symbol == "(" || previousMachine.button.type == "operator") && previousMachine.answer != "NEGATIVE_PRESSED"){
			    insertLeftParen();
				stateMachines.push(currentMachine);
			}
		    //condition for right parenthesis: can only be placed after a number, or after itself
			if(button.symbol == ")" && (previousMachine.symbol == ")" || buttonIsNumber(previousMachine.button))){
			    insertRightParen();
				stateMachines.push(currentMachine);
			}
		
		    //set up square root condition - basically detect when sqrt is pressed, prevent it from being pressed in sucession, and demand that
			//a number is pressed next.
			if(button.symbol == "R" && previousMachine.symbol != "R" && (previousMachine.button.type == "operator" || previousMachine.symbol == "(")){
			    insertSqRoot();
				stateMachines.push(currentMachine);
			}
		
		
		    //condition: check for operators, make sure the last state was not an operator itself (unless it was subtract and a negative)
			if( !buttonIsNumber(button) && button.symbol != "R" && button.symbol != "(" && button.symbol != ")" && button.symbol != "="){
				if( previousMachine.symbol != "R" && (buttonIsNumber(previousMachine.button) && button.symbol != "." && button.symbol != "=") || (previousMachine.symbol == "=") || previousMachine.symbol == ")" ){
				
				    //condition: check if last operation was not a solve
					if(previousMachine.symbol != "="){//do normally
						if(button.symbol == "-"){
						    insertSubtract();
						}else{
						    insertOperator(button.symbol);
						}
						stateMachines.push(currentMachine);
						return;
					}else if(button.symbol != "="){ //special case, get answer from the solve and use that as a basis for the next operation
					    clearEverything();
						
						insertNumber(previousMachine.answer);
						stateMachines.push(previousMachine);
						if(button.symbol == "-"){
						    insertSubtract();
						}else{
						    insertOperator(button.symbol);
						}
						stateMachines.push(currentMachine);
						return;
					}
				}else{
					if(button.symbol == "-" && previousMachine.answer != "NEGATIVE_PRESSED" && previousMachine.symbol != "."){ //cant have more than 1 negative in succession
						insertNegative();
						currentMachine.answer = "NEGATIVE_PRESSED";
						stateMachines.push(currentMachine);
						return;
					}
				}
			}
			//condition: add number
			if( buttonIsNumber(button)){
			    if(previousMachine.symbol == "="){ //we had a solve before, so clear the calc
				    clearEverything();
				}
				insertNumber(button.symbol);
				stateMachines.push(currentMachine);
				return;
			}
			//condition: add decimal, decimals cannot be pressed in succession and must be before a number
			if(button.symbol == "." && decimalPressed == false && buttonIsNumber(previousMachine.button)){
			    insertDecimal();
				stateMachines.push(currentMachine);
				return;
			}
			
			//condition: solve
			if(button.symbol == "="){
			    //first solve: regular solving
				if(previousMachine.symbol != "=" && (buttonIsNumber(previousMachine.button) || previousMachine.symbol == ")")){
				    if(isEquationValidForSolve()){
						currentMachine.answer = solveEquation(document.getElementById("equation").innerHTML);
						stateMachines.push(currentMachine);
						return;
					}
				}else if(previousMachine.symbol == "="){ //operation repeat (example: 1+1====) expected result: 4
				
				    if(stateMachines.length <= 1) return;
				
					var prev = stateMachines[stateMachines.length-2];
					var previousPreviousMachine = stateMachines[stateMachines.length-3];

					if(prev.symbol == ")" || prev.symbol == "("){
					    clearEverything();
						return;
					}
					
					if(previousPreviousMachine === undefined) return;
					
					if(previousPreviousMachine.symbol == "-"){
						insertSubtract();
					}else{
						insertOperator(previousPreviousMachine.symbol);
					}	
					stateMachines.push(previousPreviousMachine);
					equations = [];
					insertNumber(prev.symbol);
					stateMachines.push(prev);
					currentMachine.answer = solveEquation(document.getElementById("equation").innerHTML);
					stateMachines.push(currentMachine);
					return;
				}
				
			}
		}
	}
    function init(){
		var clearButton = document.getElementById('ClearButton');
		clearButton.symbol = "Clear";
		clearButton.type = "clear";
		clearButton.onclick = function(){ userClicked(this); }
		
		var clearElementButton = document.getElementById('ClearElementButton');
		clearElementButton.symbol = "CE";
		clearElementButton.type = "clear";
		clearElementButton.onclick = function(){ userClicked(this); }
		
		var leftParButton = document.getElementById('LeftParButton');
		leftParButton.symbol = "(";
		leftParButton.type = "parenthesis";
		leftParButton.onclick = function(){ userClicked(this); }	
		
		var rightParButton = document.getElementById('RightParButton');
		rightParButton.symbol = ")";
		rightParButton.type = "parenthesis";
		rightParButton.onclick = function(){ userClicked(this); }		
		
		var sqRootButton = document.getElementById('RootButton');
		sqRootButton.symbol = "R";
		sqRootButton.type = "sqroot";
		sqRootButton.onclick = function(){ userClicked(this); }
		
		var expButton = document.getElementById('ExponentButton');
		expButton.symbol = "^";
		expButton.type = "operator";
		expButton.onclick = function(){ userClicked(this); }
		
		var moduloButton = document.getElementById('ModuloButton');
		moduloButton.symbol = "%";
		moduloButton.type = "operator";
		moduloButton.onclick = function(){ userClicked(this); }
		
		var divideButton = document.getElementById('DivideButton');
		divideButton.symbol = "/";
		divideButton.type = "operator";
		divideButton.onclick = function(){ userClicked(this); }

		var mulButton = document.getElementById('MultiplyButton');
		mulButton.symbol = "x";
		mulButton.type = "operator";
		mulButton.onclick = function(){ userClicked(this); }
		
		var subButton = document.getElementById('SubtractButton');
		subButton.symbol = "-";
		subButton.type = "operator";
		subButton.onclick = function(){ userClicked(this); }
		
		var addButton = document.getElementById('PlusButton');
		addButton.symbol = "+";
		addButton.type = "operator";
		addButton.onclick = function(){ userClicked(this); }
		
		for(var i = 0; i < 10; i++){
		    var numButton = document.getElementById(i+'Button');
			numButton.symbol = i;
			numButton.type = "number";
			numButton.onclick = function(){ 
			    userClicked(this); 
			}
		}
		
		var periodButton  = document.getElementById('PeriodButton');
		periodButton.symbol = ".";
		periodButton.type = "decimal";
		periodButton.onclick = function(){ userClicked(this); }
		
		var equalsButton  = document.getElementById('EqualsButton');
		equalsButton.symbol = "=";
		equalsButton.type = "solve";
		equalsButton.onclick = function(){ userClicked(this); }
	}
	window.onload = init;
})();

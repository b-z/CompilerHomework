var lookahead;
var lookaheadptr;
var grammarTree;

function MatchToken(expected) {
	if(lookahead.value == expected) {
		lookahead = nextToken();
		return true;
	} else {
		alert("MatchToken: syntax error");
		return false;
	}
}

function parseID() {
	try {
		var id = lookahead.value;
		if(id[0] >= '0' && id[0] <= '9') {
			throw "error";
		}
		lookahead = nextToken();
		return id;		
	} catch(err) {
		return false;
	}
}

function parseQualifier() {
	var q = lookahead.value;
	lookahead = nextToken();
	return q;
}

function parseParaType() {
	try {		
		var t;
		if(lookahead.type == "paraType") {
			t = lookahead.value;
			lookahead = nextToken();
		} else if(lookahead.type == "id") {
			t = parseID();
			if(!t) {
				throw "error";
			}
		}
		return t;
	} catch(err) {
		return false;
	}
}

function parsePara() {
	try {
		var paraType = parseParaType();
		if(!paraType) {
			throw "error";
		}
		var isArray = false;
		if(lookahead.value == '[') {
			isArray = true;
			if(!MatchToken('[')) {
				throw "error";
			}
			if(!MatchToken(']')) {
				throw "error";
			}
		}
		var paraName = parseID();
		if(!paraName) {
			throw "error";
		}

		if(lookahead.value == '[') {
			isArray = true;
			if(!MatchToken('[')) {
				throw "error";
			}
			if(!MatchToken(']')) {
				throw "error";
			}
		}

		return {type:"parameter", paraType:paraType, isArray:isArray, name:paraName}	
	} catch(err) {
		return false;
	}
}

function parseVarDef(tokens) {
	try {
		if(tokens.length == 1) {
			throw "error";
		}
		var i = 0;
		var paraType = tokens[i].value;
		
		var isArray = false;
		i += 1;
		if(tokens[i].value == '[' && tokens[i+1].value == ']') {
			isArray = true;
			i += 2;
		} else if(tokens[i].value == '[' && tokens[i+1].value != ']') {
			throw "error";
		}
		var paraName = tokens[i].value;
		i += 1;
		if(i < tokens.length && tokens[i].value == '[' && tokens[i+1].value == ']') {
			isArray = true;
			i += 2;
		} else if(i < tokens.length && tokens[i].value == '[' && tokens[i+1].value != ']') {
			throw "error";
		}
		if(!MatchToken(';')) {
			throw "error";
		}

		return {type:"variable", paraType:paraType, isArray:isArray, name:paraName}	
	} catch(err) {
		return false;
	}
}

function parseExpr(tokens) {
	try {
		if(tokens[0].value == "new") {
			if(tokens.length < 3) {
				throw "error";
			}
			if(tokens[2].value == '[') {
				if(tokens[tokens.length-1].value != ']') {
					throw "error";
				}
				var paraType = tokens[1].value;
				var sizePattern = [];
				for(var i = 3; i < tokens.length-1; i++) {
					sizePattern.push(tokens[i]);
				}
				var size = parseExpr(sizePattern);
				if(!size) {
					throw "error";
				}
				return {type:"newArrayExpr", paraType:paraType, size:size}
			} else if(tokens[2].value == '(') {
				if(tokens[tokens.length-1].value != ')') {
					throw "error";
				}
				var className = tokens[1].value;
				var i = 3;
				var paraList = [];
				while(i < tokens.length-1) {
					var paraPattern = [];
					while(i < tokens.length-1 && tokens[i].value != ',' && tokens[i].value != ')') {
						paraPattern.push(tokens[i]);
						i++;
					}
					if(paraPattern.length <= 0) {
						throw "error";
					}
					var para = parseExpr(paraPattern);
					if(!para) {
						throw "error";
					}
					paraList.push(para);
					i++;
				}
				return {type:"newObjectExpr", className:className, paraList:paraList}
			} else {
				throw "error";
			}
			
		} else if(tokens[0].value == "{") {
			var valueSet = [];
			var i = 1;
			while(i < tokens.length-1) {
				var paraPattern = [];
				while(i < tokens.length-1 && tokens[i].value != ',' && tokens[i].value != '}') {
					paraPattern.push(tokens[i]);
					i++;
				}
				if(tokens[i].value == ',' && paraPattern.length <= 0) {
					throw "error";
				}
				var para = parseExpr(paraPattern);
				if(!para) {
					throw "error";
				}
				valueSet.push(para);
				i++;
			}
			return {type:"valueSetExpr", valueSet:valueSet}
		} else {
			return "expr";
		}
	} catch(err) {
		return false
	}
}

function parseAssignStat(tokens) {
	try {
		var varType;
		var varName;
		var isArray = false;
		var inArray = false;
		var posPattern = [];
		var pos;
		var exprPattern = [];
		var expr;

		//left side of "="
		if(tokens[1].value == "=") {
			//id = expr;
			varName = tokens[0].value;
			for(var i = 2; i < tokens.length; i++) {
				exprPattern.push(tokens[i]);
			}
		} else if(tokens[2].value == "=") {
			//type id = expr;
			varType = tokens[0].value;
			varName = tokens[1].value;
			for(var i = 3; i < tokens.length; i++) {
				exprPattern.push(tokens[i]);
			}
		} else if(tokens[1].value == '[' && tokens[2].value == ']') {
			isArray = true;
			varType = tokens[0].value;
			varName = tokens[3].value;
			if(tokens[5].value == "new") {
				//type[] id = new type[expr];
				if(tokens[6].value != varType) {
					throw "error";
				}
				for(var i = 5; i < tokens.length; i++) {
					exprPattern.push(tokens[i]);
				}
			} else if(tokens[5].value == '{') {
				//type[] id = {a, b, c}
				for(var i = 5; i < tokens.length; i++) {
					exprPattern.push(tokens[i]);
				}
			} else {
				throw "error";
			}
 		} else if(tokens[2].value == '[' && tokens[3].value == ']') {
			isArray = true;
			varType = tokens[0].value;
			varName = tokens[1].value;
			if(tokens[5].value == "new") {
				//type id[] = new type[expr];
				if(tokens[6].value != varType) {
					throw "error";
				}
				for(var i = 5; i < tokens.length; i++) {
					exprPattern.push(tokens[i]);
				}
			} else if(tokens[5] == '{') {
				//type id[] = {a, b, c}
				if(tokens[length-1].value != '}') {
					throw "error";
				}
				for(var i = 5; i < tokens.length; i++) {
					exprPattern.push(tokens[i]);
				}
			} else {
				throw "error";
			}
 		} else if(tokens[1].value == '[') {
 			//id[expr] = expr;
 			inArray = true;
 			varName = tokens[0].value;
 			var i;
 			for(i = 2; i < tokens.length; i++) {
 				if(tokens[i].value == ']') {
 					break;
 				}
 				posPattern.push(tokens[i]);
 			}
 			if(posPattern.length <= 0) {
 				throw "error";
 			}
 			pos = parseExpr(posPattern);
 			for(i = i + 2; i < tokens.length; i++) {
 				exprPattern.push(tokens[i]);
 			}
 		}
		else {
			throw "error";
		}
		if(exprPattern.length <= 0) {
			throw "error";
		}
		expr = parseExpr(exprPattern);
		if(!expr) {
			throw "error";
		}
		return {type:"assignExpr", varType:varType, varName:varName, isArray:isArray, inArray:inArray, pos:pos, expr:expr}
	} catch(err) {
		return false;
	}
}

function parseStat() {
	try {
		var stat;
		if(lookahead.value == "for") {
			throw "error";
		} else if(lookahead.value == "while") {
			throw "error";
		} else if(lookahead.value == "if") {
			throw "error";
		} else if(lookahead.value == "return") {
			throw "error";
		} else {			
			var pattern = [];
			var isAssignStat = false;
			while(lookahead.value != ';') {
				pattern.push(lookahead);
				if(lookahead.value == "=") {
					isAssignStat = true;
				}
				lookahead = nextToken();
			}
			if(isAssignStat) {
				stat = parseAssignStat(pattern);
			} else {
				stat = parseSingleExpr(pattern);
			}
			if(!MatchToken(';')) {
				throw "error";
			}
		}
		return stat;
	} catch(err) {
		return false;
	}
}

function parseBlock() {
	try {
		if(!MatchToken('{')){
			throw "error";
		}
		var stats = [];
		while(lookahead.value != '}') {
			var stat = parseStat();
			if(!stat) {
				throw "error";
			}
			stats.push(stat);
		}
		if(!MatchToken('}')) {
			throw "error";
		}
		return stats;
	} catch(err) {
		return false;
	}
}

function parseFunctions(tokens, qs) {	
	try {
		var i = 0;

		var retType = tokens[i].value;
		var retIsArray = false
		i++;
		if(tokens[i].value == '[' && tokens[i+1].value == ']') {
			retIsArray = true;
			i += 2;
		} else if(tokens[i].value == '[' && tokens[i+1].value != ']') {
			throw "error";
		}
		var funcName = tokens[i].value;

		//参数列表
		var paras = [];
		if(!MatchToken('(')) {
			throw "error";
		}
		if(lookahead.type == 'paraType' || lookahead.type == 'id') {
			var para = parsePara();
			if(!para) {
				throw "error";
			}
			paras.push(para);
		}
		while(lookahead.value == ',') {
			if(!MatchToken(',')) {
				throw "error";
			}
			var para = parsePara();
			if(!para) {
				throw "error";
			}
			paras.push(para);
		}
		if(!MatchToken(')')) {
			throw "error";
		}

		var stats = parseBlock();
		if(!stats) {
			throw "error";
		}
		return {type:"function", qualifiers:qs, name:funcName, retType:retType, retIsArray:retIsArray, paraList:paras, stats:stats}
	} catch(err) {
		return false;
	}
}

function parseConstructFunc(className) {
	try{
		//参数列表
		var paras = [];
		if(!MatchToken('(')) {
			throw "error";
		}
		if(lookahead.type == 'paraType' || lookahead.type == 'id') {
			var para = parsePara();
			if(!para) {
				throw "error";
			}
			paras.push(para);
		}
		while(lookahead.value == ',') {
			if(!MatchToken(',')) {
				throw "error";
			}
			var para = parsePara();
			if(!para) {
				throw "error";
			}
			paras.push(para);
		}
		if(!MatchToken(')')) {
			throw "error";
		}

		var stats = parseBlock();
		if(!stats) {
			throw "error";
		}
		return {type:"constructFunction", name:className, paraList:paras, stats:stats}
	} catch(err) {
		return false;
	}
}

function parseClass(qualifiers) {
	try {
		if(!MatchToken("class")) {
			throw "error";
		}
	
		//类名
		var className = parseID();
		if(!className) {
			throw "error";
		}

		//父类
		var fathers = [];
		if(lookahead.type == "extends") {
			MatchToken("extends");
			while(lookahead.type == "id") {
				fathers.push(parseID());
			}
		}

		//实现接口
		var interfaces = [];
		if(lookahead.type == "implement") {
			MatchToken("implement");
			while(lookahead.type == "id"){
				interfaces.push(parseID());
			}
		}

		if(!MatchToken("{")) {
			throw "error";
		}

		var vars = [];		//变量
		var assigns = [];	//赋值语句
		var cfuncs = [];	//构造函数		
		var funcs = [];		//函数
		while(lookahead.value != "}") {
			//修饰符
			var cqs = [];
			while(lookahead.type == "qualifier") {
				cqs.push(parseQualifier());
			}

			var pattern = [];
			while(lookahead.value != '(' && lookahead.value != '=' && lookahead.value != ';') {
				pattern.push(lookahead);
				lookahead = nextToken();
			}
			if(lookahead.value == '(') {
				if(pattern.length == 1) {
					if(pattern[0].value == className) {
						var cfunc = parseConstructFunc(className);
						if(!cfunc) {
							throw "error";
						}
						cfuncs.push(cfunc);
					} else {
						throw "error";
					}
				} else {
					var func = parseFunctions(pattern, cqs);
					if(!func) {
						throw "error";
					}
					funcs.push(func);
				}
			} else if(lookahead.value == ';') {
				var v = parseVarDef(pattern);
				if(!v) {
					throw "error";
				}
				vars.push(v);
			}
		}

		if(!MatchToken("}")) {
			throw "error";
		}
		return {type:"class", qualifiers:qualifiers, name:className, fathers:fathers, interfaces:interfaces, cfucns:cfuncs, fields:vars, assigns:assigns, methods:funcs}

	} catch(err) {
		return false;
	}
	
}

function parseDeclaration() {
	try {		
		var declaration;

		//修饰词
		var qualifiers = [];
		while(lookahead.type == "qualifier") {
			qualifiers.push(parseQualifier());
		}

		if(lookahead.type == "class") {
			//类的定义
			declaration = parseClass(qualifiers);
			if(!declaration) {
				throw "error";
			}
		} /*else if(lookahead.type == "paraType" || lookahead.type == "id") {
			//全局变量
			var v = parseVariable(qualifiers);
			if(lookahead.value == ";") {
				MatchToken(";");
				declaration = v;
			} else if(lookahead.value == "=") {
				MatchToken("=");
				declaration = parseAssignStat(v);
			}
		}*/ else{
			throw "error";
		}
		return declaration;
	} catch(err) {
		return false;
	}
}

function parseProgram() {
	try {
		var classes = [];
		var globalvars = [];
		//while(lookahead != null) {
			var d = parseDeclaration();
			if(!d) {
				throw "error";
			}
			if(d && d.type == "class") {
				classes.push(d);
			} else if(d && d.type == "variable") {
				globalvars.push(d);
			}
		//}
		return{type: "program", classes:classes, globalvars:globalvars}
	} catch(err) {
		return false;
	}
	
}

function Parser() {
	lookaheadptr = -1;
	lookahead = nextToken();
	try {
		grammarTree = parseProgram();
		if(!grammarTree){
			throw "error";
		}
	} catch(err) {
		alert("syntax error");
		return false;
	}
}
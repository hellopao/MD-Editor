//
// Represents a chunk of text.
//
Chunk = function(text, selectionStartIndex, selectionEndIndex, selectionScrollTop) {
	var prefixes = "(?:\\s{4,}|\\s*>|\\s*-\\s+|\\s*\\d+\\.|=|\\+|-|_|\\*|#|\\s*\\[[^\n]]+\\]:)", // Markdown symbols.
		obj = {};
	
	/*
	 * Public members.
	 */

	return extend(obj, {
		before: fixEol(text.substring(0, selectionStartIndex)),
		selection: fixEol(text.substring(selectionStartIndex, selectionEndIndex)),
		after: fixEol(text.substring(selectionEndIndex)),
		scrollTop: selectionScrollTop,
		startTag: "",
		endTag: "",
		
		// Adds blank lines to this chunk.
		addBlankLines: function(numberBefore, numberAfter, findExtra) {
			var regexText,
				replacementText,
				match;
				
			numberBefore = (typeof numberBefore === "undefined" || numberBefore === null) ? 1 : numberBefore;
			numberAfter = (typeof numberAfter === "undefined" || numberAfter === null) ? 1 : numberAfter;

			numberBefore = numberBefore + 1;
			numberAfter = numberAfter + 1;

			// New bug discovered in Chrome, which appears to be related to use of RegExp.$1
			// Hack it to hold the match results. Sucks because we're double matching...
			match = /(^\n*)/.exec(this.selection);
			this.selection = this.selection.replace(/(^\n*)/, "");
			this.startTag = this.startTag + (match ? match[1] : "");
			match = /(\n*$)/.exec(this.selection);
			this.selection = this.selection.replace(/(\n*$)/, "");
			this.endTag = this.endTag + (match ? match[1] : "");
			match = /(^\n*)/.exec(this.startTag);
			this.startTag = this.startTag.replace(/(^\n*)/, "");
			this.before = this.before + (match ? match[1] : "");
			match = /(\n*$)/.exec(this.endTag);
			this.endTag = this.endTag.replace(/(\n*$)/, "");
			this.after = this.after + (match ? match[1] : "");

			if (this.before) {
				regexText = replacementText = "";

				while (numberBefore > 0) {
					regexText = regexText + "\\n?";
					replacementText = replacementText + "\n";
					numberBefore = numberBefore - 1;
				}

				if (findExtra) {
					regexText = "\\n*";
				}

				this.before = this.before.replace(new RegExp(regexText + "$", ""), replacementText);
			}

			if (this.after) {
				regexText = replacementText = "";

				while (numberAfter > 0) {
					regexText = regexText + "\\n?";
					replacementText = replacementText + "\n";
					numberAfter = numberAfter - 1;
				}

				if (findExtra) {
					regexText = "\\n*";
				}

				this.after = this.after.replace(new RegExp(regexText, ""), replacementText);
			}
			
			return this;
		},
		
		// Sets this chunk's start and end tags using the given expressions.
		setTags: function(startExp, endExp) {
			var that = this,
				tempExp;

			if (startExp) {
				tempExp = extendRegExp(startExp, "", "$");

				this.before = this.before.replace(tempExp, function(match) {
					that.startTag = that.startTag + match;
					return "";
				});

				tempExp = extendRegExp(startExp, "^", "");

				this.selection = this.selection.replace(tempExp, function(match) {
					that.startTag = that.startTag + match;
					return "";
				});
			}

			if (endExp) {
				tempExp = extendRegExp(endExp, "", "$");

				this.selection = this.selection.replace(tempExp, function(match) {
					that.endTag = match + that.endTag;
					return "";
				});
				
				tempExp = extendRegExp(endExp, "^", "");

				this.after = this.after.replace(tempExp, function(match) {
					that.endTag = match + that.endTag;
					return "";
				});
			}

			return this;
		},
		
		// Trims whitespace from this chunk.
		trimWhitespace: function(remove) {
			this.selection = this.selection.replace(/^(\s*)/, "");

			if (!remove) {
				this.before = this.before + RegExp.$1;
			}

			this.selection = this.selection.replace(/(\s*)$/, "");

			if (!remove) {
				this.after = RegExp.$1 + this.after;
			}
			
			return this;
		},
		
		// Removes wrapping Markdown symbols from this chunk's selection.
		unwrap: function() {
			var text = new RegExp("([^\\n])\\n(?!(\\n|" + prefixes + "))", "g");
			this.selection = this.selection.replace(text, "$1 $2");
			return this;
		},
		
		// Wraps this chunk's selection in Markdown symbols.
		wrap: function(len) {
			var regex = new RegExp("(.{1," + len + "})( +|$\\n?)", "gm");
			this.unwrap();
			this.selection = this.selection.replace(regex, function(line, marked) {
				if (new RegExp("^" + prefixes, "").test(line)) {
					return line;
				}
				
				return marked + "\n";
			});
			
			this.selection = this.selection.replace(/\s+$/, "");
			
			return this;
		}
	});
};
//
// Provides common command functions.
//
Command = function(wmd, definition, runner, options) {
	options = extend({
		downCssSuffix: "-down"
	}, options);
	
	var element,
		obj = {},
		downCss = definition.css + options.downCssSuffix;
		
	/*
	 * Private members.
	 */
	
	// Resets this command element's CSS to its original state.
	function resetCss() {
		if (element) {
			element.className = Command.css.base + " " + definition.css;
		}
	}
	
	/*
	 * Public members.
	 */

	return extend(obj, {
		// Draws the command DOM and adds it to the given parent element.
		draw:function(parent) {
			var span,
				downCss = definition.css + options.downCssSuffix;

			if (!element) {
				element = document.createElement("li");
				element.title = definition.title;
				parent.appendChild(element);

				span = document.createElement("span");
				span.innerHTML = definition.text;
				element.appendChild(span);

				addEvent(element, "click", function(event) {
					resetCss();
					obj.run();
				});
				
				addEvent(element, "mouseover", function(event) {
					resetCss();
					addClassName(element, downCss);
					//addClassName(element, Command.css.over);
				});
				
				addEvent(element, "mouseout", function(event) {
					resetCss();
				});
				
				addEvent(element, "mousedown", function(event) {
					resetCss();
					addClassName(element, Command.css.down);
					addClassName(element, downCss);
					
					if (browser.IE) {
						wmd.ieClicked = true;
						wmd.ieRange = document.selection.createRange();
					}
				});
			} else {
				parent.appendChild(element);
			}
			
			resetCss();
		},
		
		// Runs the command.
		run:function() {
			var state = new InputState(wmd),
				chunk = state.getChunk();

			runner(wmd, chunk, function() {
				state.setChunk(chunk);
				state.restore();
			});
		}
	});
};

// Static functions and properties.
extend(Command, {
	// Common command CSS classes.
	css: {base:"wmd-command", over:"wmd-command-over", down:"wmd-command-down"},

	// Performs an auto-indent command for editing lists, quotes and code.
	autoIndent: function(wmd, chunk, callback, args) {
		args = extend(args, {
			preventDefaultText: true
		});
		
		chunk.before = chunk.before.replace(/(\n|^)[ ]{0,3}([*+-]|\d+[.])[ \t]*\n$/, "\n\n");
		chunk.before = chunk.before.replace(/(\n|^)[ ]{0,3}>[ \t]*\n$/, "\n\n");
		chunk.before = chunk.before.replace(/(\n|^)[ \t]+\n$/, "\n\n");

		if (/(\n|^)[ ]{0,3}([*+-])[ \t]+.*\n$/.test(chunk.before)) {
			Command.runners.ul(wmd, chunk, callback, extend(args, {preventDefaultText:false}));
		} else if (/(\n|^)[ ]{0,3}(\d+[.])[ \t]+.*\n$/.test(chunk.before)) {
			Command.runners.ol(wmd, chunk, callback, extend(args, {preventDefaultText:false}));
		} else if (/(\n|^)[ ]{0,3}>[ \t]+.*\n$/.test(chunk.before)) {
			Command.runners.blockquote(wmd, chunk, callback, args);
		} else if (/(\n|^)(\t|[ ]{4,}).*\n$/.test(chunk.before)) {
			Command.runners.code(wmd, chunk, callback, args);
		} else if (typeof callback === "function") {
			callback();
		}
	},
	
	// Creates and returns a Command instance.
	create: function(wmd, key, definition) {
		return new Command(wmd, definition, Command.runners[key]);
	},
	
	// Creates a spacer that masquerades as a command.
	createSpacer: function(wmd, key, definition) {
		var element = null;
		
		return {
			draw: function(parent) {
				var span;
				
				if (!element) {
					element = document.createElement("li");
					element.className = Command.css.base + " " + definition.css;
					parent.appendChild(element);
					
					span = document.createElement("span");
					element.appendChild(span);
				} else {
					parent.appendChild(element);
				}
				
				return element;
			},
			
			run: function() { }
		};
	},
	
	// Creates a common submit/cancel form dialog.
	createSubmitCancelForm: function(title, onSubmit, onDestroy) {
		var cancel = document.createElement("a"),
			form = new Form(title, {
				dialog: true,
				onSubmit: onSubmit,
				onDestroy: onDestroy
			}),
			submitField = new Field("", "submit", {
				value: Translator.submit
			});
		
		form.addField("submit", submitField);
		
		cancel.href = "javascript:void(0);";
		cancel.innerHTML = Translator.cancel;
		cancel.onclick = function() { form.destroy(); };
		
		submitField.insert("&nbsp;or&nbsp;");
		submitField.insert(cancel);
		
		return form;
	},
	
	// Runs a link or image command.
	runLinkImage: function(wmd, chunk, callback, args) {
		var callback = typeof callback === "function" ? callback : function() { };

		function make(link) {
			var linkDef,
				num;
				
			if (link) {
				chunk.startTag = chunk.endTag = "";
				linkDef = " [999]: " + link;
				
				num = LinkHelper.add(chunk, linkDef);
				chunk.startTag = args.tag === "img" ? "![" : "[";
				chunk.endTag = "][" + num + "]";
				
				if (!chunk.selection) {
					if (args.tag === "img") {
						chunk.selection = Translator.imageAlt;
					} else {
						chunk.selection = Translator.linkText;
					}
				}
			}
		}
		
		chunk.trimWhitespace();
		chunk.setTags(/\s*!?\[/, /\][ ]?(?:\n[ ]*)?(\[.*?\])?/);
		
		if (chunk.endTag.length > 1) {
			chunk.startTag = chunk.startTag.replace(/!?\[/, "");
			chunk.endTag = "";
			LinkHelper.add(chunk);
			callback();
		} else if (/\n\n/.test(chunk.selection)) {
			LinkHelper.add(chunk);
			callback();
		} else if (typeof args.prompt === "function") {
			args.prompt(function(link) {
				make(link);
				callback();
			});
		} else {
			make(args.link || null);
			callback();
		}
	},
	
	// Runs a list command (ol or ul).
	runList: function(wmd, chunk, callback, args) {
		var previousItemsRegex = /(\n|^)(([ ]{0,3}([*+-]|\d+[.])[ \t]+.*)(\n.+|\n{2,}([*+-].*|\d+[.])[ \t]+.*|\n{2,}[ \t]+\S.*)*)\n*$/,
			nextItemsRegex = /^\n*(([ ]{0,3}([*+-]|\d+[.])[ \t]+.*)(\n.+|\n{2,}([*+-].*|\d+[.])[ \t]+.*|\n{2,}[ \t]+\S.*)*)\n*/,
			finished = false,
			bullet = "-",
			num = 1,
			hasDigits,
			nLinesBefore,
			prefix,
			nLinesAfter,
			spaces;

		callback = typeof callback === "function" ? callback : function() { };

		// Get the item prefix - e.g. " 1. " for a numbered list, " - " for a bulleted list.
		function getItemPrefix() {
			var prefix;
			
			if(args.tag === "ol") {
				prefix = " " + num + ". ";
				num = num + 1;
			} else {
				prefix = " " + bullet + " ";
			}
			
			return prefix;
		}
		
		// Fixes the prefixes of the other list items.
		function getPrefixedItem(itemText) {
			// The numbering flag is unset when called by autoindent.
			if(args.tag === undefined){
				args.tag = /^\s*\d/.test(itemText) ? "ol" : "ul";
			}
			
			// Renumber/bullet the list element.
			itemText = itemText.replace(/^[ ]{0,3}([*+-]|\d+[.])\s/gm, function( _ ) {
				return getItemPrefix();
			});
				
			return itemText;
		};
		
		chunk.setTags(/(\n|^)*[ ]{0,3}([*+-]|\d+[.])\s+/, null);
		
		if(chunk.before && !/\n$/.test(chunk.before) && !/^\n/.test(chunk.startTag)) {
			chunk.before = chunk.before + chunk.startTag;
			chunk.startTag = "";
		}
		
		if(chunk.startTag) {
			hasDigits = /\d+[.]/.test(chunk.startTag);
			
			chunk.startTag = "";
			chunk.selection = chunk.selection.replace(/\n[ ]{4}/g, "\n");
			chunk.unwrap();
			chunk.addBlankLines();
			
			if(hasDigits) {
				// Have to renumber the bullet points if this is a numbered list.
				chunk.after = chunk.after.replace(nextItemsRegex, getPrefixedItem);
			}
			
			if (hasDigits && args.tag === "ol") {
				finished = true;
			}
		}
		
		if (!finished) {
			nLinesBefore = 1;

			chunk.before = chunk.before.replace(previousItemsRegex, function(itemText) {
					if(/^\s*([*+-])/.test(itemText)) {
						bullet = RegExp.$1;
					}
					
					nLinesBefore = /[^\n]\n\n[^\n]/.test(itemText) ? 1 : 0;
					
					return getPrefixedItem(itemText);
				});

			if(!chunk.selection) {
				chunk.selection = args.preventDefaultText ? " " : Translator.listItem;
			}
			
			prefix = getItemPrefix();
			nLinesAfter = 1;

			chunk.after = chunk.after.replace(nextItemsRegex, function(itemText) {
					nLinesAfter = /[^\n]\n\n[^\n]/.test(itemText) ? 1 : 0;
					return getPrefixedItem(itemText);
			});
			
			chunk.trimWhitespace(true);
			chunk.addBlankLines(nLinesBefore, nLinesAfter, true);
			chunk.startTag = prefix;
			spaces = prefix.replace(/./g, " ");
			
			chunk.wrap(wmd.options.lineLength - spaces.length);
			chunk.selection = chunk.selection.replace(/\n/g, "\n" + spaces);
		}
		
		callback();
	},
	
	// Runs a bold or italic command.
	runStrongEm: function(wmd, chunk, callback, args) {
		var starsBefore,
			starsAfter,
			prevStars,
			markup;
		
		callback = typeof callback === "function" ? callback : function() { };	
		
		extend({
			stars: 2
		}, args)
			
		chunk.trimWhitespace();
		chunk.selection = chunk.selection.replace(/\n{2,}/g, "\n");
		
		chunk.before.search(/(\**$)/);
		starsBefore = RegExp.$1;
		
		chunk.after.search(/(^\**)/);
		starsAfter = RegExp.$1;
		
		prevStars = Math.min(starsBefore.length, starsAfter.length);
		
		// Remove stars if already marked up.
		if ((prevStars >= args.stars) && (prevStars !== 2 || args.stars !== 1)) {
			chunk.before = chunk.before.replace(RegExp("[*]{" + args.stars + "}$", ""), "");
			chunk.after = chunk.after.replace(RegExp("^[*]{" + args.stars + "}", ""), "");
		} else if (!chunk.selection && starsAfter) {
			// Move some stuff around?
			chunk.after = chunk.after.replace(/^([*_]*)/, "");
			chunk.before = chunk.before.replace(/(\s?)$/, "");
			chunk.before = chunk.before + starsAfter + RegExp.$1;
		} else {
			if (!chunk.selection && !starsAfter) {
				chunk.selection = args.text || "";
			}
			
			// Add the markup.
			markup = args.stars <= 1 ? "*" : "**";
			chunk.before = chunk.before + markup;
			chunk.after = markup + chunk.after;
		}
		
		callback();
	},
	
	// Built-in command runners.
	runners: {
		// Performs an "a" command.
		a: function(wmd, chunk, callback, args) {
			Command.runLinkImage(wmd, chunk, callback, extend({
				tag: "a",
				prompt: function(onComplete) {
					LinkHelper.createDialog(Translator.insertLink, Translator.linkURL, onComplete);
				}
			}, args));
		},
		
		// Performs a "blockquote" command.
		blockquote: function(wmd, chunk, callback, args) {
			args = args || {};
			callback = typeof callback === "function" ? callback : function() { };
			
			chunk.selection = chunk.selection.replace(/^(\n*)([^\r]+?)(\n*)$/, function(totalMatch, newlinesBefore, text, newlinesAfter) {
				chunk.before += newlinesBefore;
				chunk.after = newlinesAfter + chunk.after;
				return text;
			});
			
			chunk.before = chunk.before.replace(/(>[ \t]*)$/, function(totalMatch, blankLine) {
				chunk.selection = blankLine + chunk.selection;
				return "";
			});
			
			chunk.selection = chunk.selection.replace(/^(\s|>)+$/ ,"");
			chunk.selection = chunk.selection || (args.preventDefaultText ? "" : Translator.blockquote);
			
			if (chunk.before) {
				chunk.before = chunk.before.replace(/\n?$/,"\n");
			}
			
			if (chunk.after) {
				chunk.after = chunk.after.replace(/^\n?/,"\n");
			}

			chunk.before = chunk.before.replace(/(((\n|^)(\n[ \t]*)*>(.+\n)*.*)+(\n[ \t]*)*$)/, function(totalMatch) {
				chunk.startTag = totalMatch;
				return "";
			});

			chunk.after = chunk.after.replace(/^(((\n|^)(\n[ \t]*)*>(.+\n)*.*)+(\n[ \t]*)*)/, function(totalMatch) {
				chunk.endTag = totalMatch;
				return "";
			});
			
			function replaceBlanksInTags(useBracket) {
				var replacement = useBracket ? "> " : "";

				if (chunk.startTag) {
					chunk.startTag = chunk.startTag.replace(/\n((>|\s)*)\n$/, function(totalMatch, markdown) {
						return "\n" + markdown.replace(/^[ ]{0,3}>?[ \t]*$/gm, replacement) + "\n";
					});
				}
				
				if (chunk.endTag) {
					chunk.endTag = chunk.endTag.replace(/^\n((>|\s)*)\n/, function(totalMatch, markdown) {
						return "\n" + markdown.replace(/^[ ]{0,3}>?[ \t]*$/gm, replacement) + "\n";
					});
				}
			}
			
			if (/^(?![ ]{0,3}>)/m.test(chunk.selection)) {
				chunk.wrap(wmd.options.lineLength - 2)
				chunk.selection = chunk.selection.replace(/^/gm, "> ");
				replaceBlanksInTags(true);
				chunk.addBlankLines();
			} else {
				chunk.selection = chunk.selection.replace(/^[ ]{0,3}> ?/gm, "");
				chunk.unwrap();
				replaceBlanksInTags(false);

				if(!/^(\n|^)[ ]{0,3}>/.test(chunk.selection) && chunk.startTag) {
					chunk.startTag = chunk.startTag.replace(/\n{0,2}$/, "\n\n");
				}

				if(!/(\n|^)[ ]{0,3}>.*$/.test(chunk.selection) && chunk.endTag) {
					chunk.endTag = chunk.endTag.replace(/^\n{0,2}/, "\n\n");
				}
			}

			if (!/\n/.test(chunk.selection)) {
				chunk.selection = chunk.selection.replace(/^(> *)/, function(wholeMatch, blanks) {
					chunk.startTag = chunk.startTag + blanks;
					return "";
				});
			}
			
			callback();
		},
		
		// Performs a "code" command.
		code: function(wmd, chunk, callback, args) {
			args = args || {};
			callback = typeof callback === "function" ? callback : function() { };
			
			var textBefore = /\S[ ]*$/.test(chunk.before),
				textAfter = /^[ ]*\S/.test(chunk.after),
				linesBefore = 1,
				linesAfter = 1;
				
			// Use 4-space mode.
			if (!(textBefore && !textAfter) || /\n/.test(chunk.selection)) {
				chunk.before = chunk.before.replace(/[ ]{4}$/, function(totalMatch) {
						chunk.selection = totalMatch + chunk.selection;
						return "";
				});
				
				if (/\n(\t|[ ]{4,}).*\n$/.test(chunk.before) || chunk.after === "" || /^\n(\t|[ ]{4,})/.test(chunk.after)) {
					linesBefore = 0; 
				}
				
				chunk.addBlankLines(linesBefore, linesAfter);
				
				if (!chunk.selection) {
					chunk.startTag = "    ";
					chunk.selection = args.preventDefaultText ? "" : Translator.enterCodeHere;
				} else {
					if (/^[ ]{0,3}\S/m.test(chunk.selection)) {
						chunk.selection = chunk.selection.replace(/^/gm, "    ");
					} else {
						chunk.selection = chunk.selection.replace(/^[ ]{4}/gm, "");
					}
				}
			} else { // Use ` (tick) mode.
				chunk.trimWhitespace();
				chunk.setTags(/`/, /`/);

				if (!chunk.startTag && !chunk.endTag) {
					chunk.startTag = chunk.endTag = "`";
					
					if (!chunk.selection) {
						chunk.selection = args.preventDefaultText ? "" : Translator.enterCodeHere;
					}
				} else if (chunk.endTag && !chunk.startTag) {
					chunk.before = chunk.before + chunk.endTag;
					chunk.endTag = "";
				} else {
					chunk.startTag = chunk.endTag = "";
				}
			}
			
			callback();
		},

		// Performs an "italic" command.
		em: function(wmd, chunk, callback, args) {
			Command.runStrongEm(wmd, chunk, callback, extend({
				stars: 1,
				text: "emphasized text"
			}, args));
		},

		// Performs a "h1.." command.
		h: function(wmd, chunk, callback, args) {
			args = args || {};
			callback = typeof callback === "function" ? callback : function() { };
			
			var headerLevel = 0,
				headerLevelToCreate,
				headerChar,
				len;
			
			// Remove leading/trailing whitespace and reduce internal spaces to single spaces.
			chunk.selection = chunk.selection.replace(/\s+/g, " ");
			chunk.selection = chunk.selection.replace(/(^\s+|\s+$)/g, "");
			
			// If we clicked the button with no selected text, we just
			// make a level 2 hash header around some default text.
			if (!chunk.selection) {
				chunk.startTag = "## ";
				chunk.selection = "Heading";
				chunk.endTag = " ##";
			} else {
				// Remove any existing hash heading markdown and save the header level.
				chunk.setTags(/#+[ ]*/, /[ ]*#+/);
				
				if (/#+/.test(chunk.startTag)) {
					headerLevel = RegExp.lastMatch.length;
				}
				
				chunk.startTag = chunk.endTag = "";
				
				// Try to get the current header level by looking for - and = in the line
				// below the selection.
				chunk.setTags(null, /\s?(-+|=+)/);
				
				if (/=+/.test(chunk.endTag)) {
					headerLevel = 1;
				} else if (/-+/.test(chunk.endTag)) {
					headerLevel = 2;
				}
				
				// Skip to the next line so we can create the header markdown.
				chunk.startTag = chunk.endTag = "";
				chunk.addBlankLines(1, 1);
				
				// We make a level 2 header if there is no current header.
				// If there is a header level, we substract one from the header level.
				// If it's already a level 1 header, it's removed.
				headerLevelToCreate = headerLevel === 0 ? 2 : headerLevel - 1;
				
				if (headerLevelToCreate > 0) {
					headerChar = headerLevelToCreate >= 2 ? "-" : "=";
					len = chunk.selection.length;
					
					if (len > wmd.options.lineLength) {
						len = wmd.options.lineLength;
					}
					
					chunk.endTag = "\n";
					
					while (len > 0) {
						chunk.endTag = chunk.endTag + headerChar;
						len = len - 1;
					}
				}
			}
			
			callback();
		},

		// Performs an "hr" command.
		hr: function(wmd, chunk, callback, args) {
			args = args || {};
			callback = typeof callback === "function" ? callback : function() { };
			
			chunk.startTag = "----------\n";
			chunk.selection = "";
			chunk.addBlankLines(2, 1, true);
			
			callback();
		},
		
		// Performs an "img" command.
		img: function(wmd, chunk, callback, args) {
			Command.runLinkImage(wmd, chunk, callback, extend({
				tag: "img",
				prompt: function(onComplete) {
					LinkHelper.createDialog(Translator.insertImage, Translator.imageURL, onComplete);
				}
			}, args));
		},

		// Performs a "ol" command.
		ol: function(wmd, chunk, callback, args) {
			Command.runList(wmd, chunk, callback, extend({
				tag: "ol"
			}, args));
		},
		
		// Performs a "bold" command.
		strong: function(wmd, chunk, callback, args) {
			Command.runStrongEm(wmd, chunk, callback, extend({
				stars: 2,
				text: "strong text"
			}, args));
		},
		
		// Performs a "ul" command.
		ul: function(wmd, chunk, callback, args) {
			Command.runList(wmd, chunk, callback, extend({
				tag: "ul"
			}, args));
		}
	}
});

// Built-in command lookup table.
Command.builtIn = {
	"strong": {text:Translator.strongText, title:Translator.strongTitle, css:"wmd-strong", shortcut:"b"},
	"em": {text:Translator.emText, title:Translator.emTitle, css:"wmd-em", shortcut:"i"},
	"a": {text:Translator.aText, title:Translator.aTitle, css:"wmd-a", shortcut:"l"},
	"blockquote": {text:Translator.blockquoteText, title:Translator.blockquoteTitle, css:"wmd-blockquote", shortcut:"q"},
	"code": {text:Translator.codeText, title:Translator.codeTitle, css:"wmd-code", shortcut:"k"},
	"img": {text:Translator.imgText, title:Translator.imgTitle, css:"wmd-img", shortcut:"g"},
	"ol": {text:Translator.olText, title:Translator.olTitle, css:"wmd-ol", shortcut:"o"},
	"ul": {text:Translator.ulText, title:Translator.ulTitle, css:"wmd-ul", shortcut:"u"},
	"h": {text:Translator.hText, title:Translator.hTitle, css:"wmd-h", shortcut:"h"},
	"hr": {text:Translator.hrText, title:Translator.hrTitle, css:"wmd-hr", shortcut:"r"},
	"spacer": {css:"wmd-spacer", builder:Command.createSpacer}
};

//
// Creates a dialog (i.e., a container) with an optional screen overlay.
//
Dialog = function(options) {
	var obj,
		element,
		overlay,
		events = [],
		options = extend({
			zIndex: 10,
			css: "wmd-dialog",
			overlayColor: "#FFFFFF",
			modal: true,
			closeOnEsc: true,
			insertion: null,
			onDestroy: null
		}, options);
	
	/*
	 * Private members.
	 */
	
	// Builds the dialog's DOM.
	function build() {
		if (!element) {

			if (options.modal) {
				overlay = new Overlay({
					color: options.overlayColor,
					zIndex: options.zIndex - 1
				});
			}
			
			element = document.createElement("div");
			document.body.appendChild(element);
			
			element.className = options.css;
			element.style.position = "absolute";
			element.style.zIndex = options.zIndex;
			element.style.top = ((window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop)
                            +((window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight)/2)) 
                            - 150
                            + "px";
			if (options.insertion) {
				obj.fill(options.insertion);
			}
			
			if (options.closeOnEsc) {
				addEvent(document, "keypress", function(event) {
					var ev = event || window.event,
						keyCode = ev.keyCode || ev.which;
						
					if (keyCode === 27) {
						obj.destroy();
					}
				}, events);
			}
		}
	}
	
	/*
	 * Public members.
	 */
	
	obj = extend(obj, {
		// Destroys the dialog.
		destroy: function() {
			while(events.length > 0) {
				removeEvent(events[0].element, events[0].event, events[0].callback, events);
			}
			
			if (overlay) {
				overlay.destroy();
				overlay = null;
			}
			
			if (element) {
				element.parentNode.removeChild(element);
				element = null;
			}
			
			if (typeof options.onDestroy === "function") {
				options.onDestroy(this);
			}
		},
		
		// Fills the dialog with an insertion, clearing it first.
		fill: function(insertion) {
			if (element) {
				element.innerHTML = "";
				insertion = insertion || "";
				
				if (typeof insertion === "string") {
					element.innerHTML = insertion;
				} else {
					element.appendChild(insertion);
				}
			}
		},
		
		// Hides the dialog.
		hide: function() {
			if (element) {
				element.style.display = "none";
			}
		},
		
		// Forces the browser to redraw the dialog.
		// Hack to work around inconsistent rendering in Firefox
		// when the dialog's element has browser-implemented rounded 
		// corners and its contents expand/contract the element's size.
		redraw: function() {
			var css;

			if (element) {
				css = element.className;
				element.className = "";
				element.className = css;
			}
		},
		
		// Shows the dialog.
		show: function() {
			if (element) {
				element.style.display = "";
			}
		}
	});
	
	build();
	return obj;
};

//
// Creates a simple screen overlay.
//
Overlay = function(options) {
	var obj = {},
		events = [],
		element,
		iframe,
		options = extend({
			color: "#FFFFFF",
			zIndex: 9,
			scroll: true,
			opacity: 0.3
		}, options); 
		
	/*
	 * Private members.
	 */
	
	// Updates the DOM element's size a position to fill the screen.
	function update() {
		var scroll,
			size;
			
		if (element) {
			scroll = {
				left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
				top: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop
			};

			size = getViewportDimensions();

			element.style.width = size.width + "px";
			element.style.height = size.height + "px";
			element.style.left = scroll.left + "px";
			element.style.top = scroll.top + "px";

			if (iframe) {
				iframe.style.width = size.width + "px";
				iframe.style.height = size.height + "px";
				iframe.style.left = scroll.left + "px";
				iframe.style.top = scroll.top + "px";
			}
		}
	}
	
	// Builds the overlay's DOM.
	function build() {
		if (!element) {
			element = document.createElement("div");
			document.body.appendChild(element);

			element.style.position = "absolute";
			element.style.background = options.color;
			element.style.zIndex = options.zIndex;
			element.style.opacity = options.opacity;

			// Check for IE, in which case we need to add an iframe mask.
			if (browser.IE) {
				element.style.filter = "progid:DXImageTransform.Microsoft.Alpha(opacity=" + (options.opacity * 100) + ")";
				
				iframe = document.createElement("iframe");
				document.body.appendChild(iframe);

				iframe.frameBorder = "0";
				iframe.scrolling = "no";
				iframe.style.position = "absolute";
				iframe.style.filter = "progid:DXImageTransform.Microsoft.Alpha(opacity=0)";
				iframe.style.zIndex = options.zIndex - 1;
			}

			if (options.scroll) {
				addEvent(window, "resize", update, events);
				addEvent(window, "load", update, events);
				addEvent(window, "scroll", update, events);
			}

			update();
		}
	}
	
	/*
	 * Public members.
	 */

	obj = extend(obj, {
		// Destroys the overlay.
		destroy: function() {
			while(events.length > 0) {
				removeEvent(events[0].element, events[0].event, events[0].callback, events);
			}
			
			if (element) {
				element.parentNode.removeChild(element);
				element = null;
			}
			
			if (iframe) {
				iframe.parentNode.removeChild(iframe);
				iframe = null;
			}
		}
	});
	
	build();
	return obj;
};
//
// Represents a field in a form.
//
Field = function(label, type, options) {
	label = label || "";
	type = type.toLowerCase();
	options = extend({
		required: false,
		inline: false,
		"float": false,
		items: null,
		itemsAlign: "left",
		css: "wmd-field",
		inputCss: "wmd-fieldinput",
		buttonCss: "wmd-fieldbutton",
		passwordCss: "wmd-fieldpassword",
		labelCss: "wmd-fieldlabel",
		inlineCss: "wmd-fieldinline",
		floatCss: "wmd-fieldfloat",
		errorCss: "wmd-fielderror",
		reasonCss: "wmd-fieldreason",
		hiddenCss: "wmd-hidden",
		value: "",
		group: "",
		id: "",
		insertion: null
	}, options);
	
	var element,
		labelElement,
		inner,
		inputs,
		errorElement,
		events = [],
		setFor = false;
	
	if (indexOf(Field.TYPES, type) < 0) {
		throw('"' + type + '" is not a valid field type.');
	}
	
	if (!options.id) {
		options.id = randomString(6, {upper:false});
	}
	
	element = document.createElement("div");
	element.id = options.id;
	element.className = options.css;
	
	if (options.inline) {
		addClassName(element, options.inlineCss);
	}
	
	if (options["float"]) {
		addClassname(element, options.floatCss);
	}
	
	if (type === "hidden") {
		addClassName(element, options.hiddenCss);
	}
	
	if (label) {
		labelElement = document.createElement("label");
		labelElement.className = options.labelCss;
		labelElement.innerHTML = label;
		
		if (options.required) {
			labelElement.innerHTML += ' <em>*</em>';
		}
		
		element.appendChild(labelElement);
	}
	
	inner = document.createElement("div");
	
	if (options.inline) {
		inner.className = options.inlineCss;
	}
	
	element.appendChild(inner);
	
	errorElement = document.createElement("div");
	errorElement.className = options.reasonCss;
	errorElement.style.display = "none";
	element.appendChild(errorElement);
	
	// Run the factory. We're doing a hack when setting the label's "for" attribute,
	// but we control the format in all of the create functions, so just keep it in mind.
	switch(type) {
		case("empty"):
			break;
		case("checkbox"):
		case("radio"):
			inputs = Field.createInputList(inner, type, options);
			break;
		case("select"):
			inputs = Field.createSelectList(inner, type, options);
			setFor = true;
			break;
		case("textarea"):
			inputs = Field.createTextArea(inner, type, options);
			setFor = true;
			break;
		default:
			inputs = Field.createInput(inner, type, options);
			setFor = true;
			break;
	}
	
	if (typeof inputs === "undefined") {
		inputs = null;
	}
	
	if (labelElement && setFor) {
		labelElement.setAttribute("for", Field.getInputId(options));
	}
	
	/*
	 * Public members.
	 */
	
	extend(element, {
		// Adds an event to the field's input.
		addEvent: function(event, callback) {
			var c = function() { callback(element); },
				input,
				i,
				n;
			
			if (inputs) {
				switch(type) {
					case("empty"):
						break;
					case("checkbox"):
					case("radio"):
						for(i = 0, n = inputs.length; i < n; i++) {
							addEvent(inputs[i], event, c, events);
						}
						break;
					default:
						addEvent(inputs, event, c, events);
						break;
				}
			}
			
			return this;
		},
		
		// Destroys the field.
		destroy: function() {
			while(events.length > 0) {
				removeEvent(events[0].element, events[0].action, events[0].callback, events);
			}
			
			element.parentNode.removeChild(element);
			
			return this;
		},
		
		// Sets the field error.
		error: function(show, message) {
			if (show) {
				addClassName(element, options.errorCss);
				
				if (message) {
					errorElement.innerHTML = message.toString();
					errorElement.style.display = "";
				} else {
					errorElement.innerHTML = "";
					errorElement.style.display = "none";
				}
			} else {
				removeClassName(element, options.errorCss);
				errorElement.style.display = "none";
			}
			
			return this;
		},
		
		// Focuses the field's input.
		focus: function() {
			if (this.isVisible()) {
				if (inputs) {
					if (inputs.length > 0 && (type === "checkbox" || type === "radio")) {
						inputs[0].focus();
					} else {
						inputs.focus();
					}
				}
			}
			
			return this;
		},
		
		// Hides the field.
		hide: function() {
			element.style.display = "none";
		},
		
		// Inserts HTML or DOM content into the field.
		insert: function(insertion) {
			insertion = insertion || "";
			
			var div,
				i,
				n;
			
			if (typeof insertion === "string") {
				div = document.createElement("div");
				div.innerHTML = insertion;
				
				for(i = 0, n = div.childNodes.length; i < n; i++) {
					inner.appendChild(div.childNodes[i]);
				}
			} else {
				inner.appendChild(insertion);
			}
			
			return this;
		},
		
		// Gets a value indicating whether the field is required.
		isRequired: function() {
			return !!(options.required);
		},
		
		// Gets a value indicating whether the field is visible.
		isVisible: function() {
			return !(element.style.display);
		},
		
		// Gets the field's label text.
		getLabel: function() {
			return label || "";
		},
		
		// Gets the field's type.
		getType: function() {
			return type;
		},
		
		// Gets the field's current value.
		getValue: function(primitives) {
			var value,
				i,
				n;
			
			// Helper for casting values into primitives.
			function primitive(val) {
				var bools,
					numbers,
					num;
					
				if (primitives) {
					bools = /^(true)|(false)$/i.exec(val);
					
					if (bools) {
						val = (typeof bools[2] === "undefined" || bools[2] === "") ? true : false;
					} else {
						numbers = /^\d*(\.?\d+)?$/.exec(val);
						
						if (numbers && numbers.length > 0) {
							num = (typeof numbers[1] === "undefined" || numbers[1] === "") ? parseInt(val, 10) : parseFloat(val, 10);
							
							if (!isNaN(num)) {
								val = num;
							}
						}
					}
				}
				
				return val;
			}

			if (inputs) {
				switch(type) {
					case("empty"):
						break;
					// Array of checked box values.
					case("checkbox"):
						value = [];
						for(i = 0, n = inputs.length; i < n; i++) {
							if (inputs[i].checked) {
								value.push(primitive(inputs[i].value));
							}
						}
						break;
					// Single checked box value.
					case("radio"):
						value = "";
						for(i = 0, n = inputs.length; i < n; i++) {
							if (inputs[i].checked) {
								value = primitive(inputs[i].value);
								break;
							}
						}
						break;
					case("select"):
						value = primitive(inputs.options[input.selectedIndex].value);
						break;
					default:
						value = inputs.value;
						break;
				}
			}
		
			return value;
		},
		
		// Sets the field's value.
		setValue: function(value) {
			var input,
				i,
				n,
				j,
				m,
				selectedIndex;

			// Helper for comparing the current value of input to a string.
			function li(s) { 
				return (s || "").toString() === (input ? input.value : "") 
			}
			
			if (inputs) {
				switch(type) {
					case("empty"):
						break;
					// If the value is a number we assume a flagged enum.
					case("checkbox"):
						if (typeof value === "number") {
							value = getArrayFromEnum(value);
						} else if (typeof value === "string") {
							value = [value];
						}
					
						if (value.length) {
							for(i = 0, n = inputs.length; i < n; i++) {
								input = inputs[i];
								input.checked = "";
							
								for(j = 0, m = value.length; j < m; j++) {
									if (li(value[j])) {
										input.checked = "checked";
										break;
									}
								}
							}
						}
						break;
					case("radio"):
						value = (value || "").toString();
						for(i = 0, n = inputs.length; i < n; i++) {
							inputs[i].checked = "";
						
							if (inputs[i].value === value) {
								inputs[i].checked = "checked";
							}
						}
						break;
					case("select"):
						value = (value || "").toString();
						selectedIndex = 0;
					
						for(i = 0, n = inputs.options.length; i < n; i++) {
							if (inputs.options[i].value === value) {
								selectedIndex = i;
								break;
							}
						}
					
						inputs.selectedIndex = selectedIndex;
						break;
					default:
						value = (value || "").toString();
						inputs.value = value;
						break;
				}
			}
			
			return this;
		},
		
		// Shows the field.
		show: function() {
			element.style.display = "";
		}
	});
	
	if (options.insertion) {
		element.insert(options.insertion);
	}
	
	return element;
};

// Static Field members.
extend(Field, {
	TYPES: [
		"button",
		"checkbox",
		"empty",
		"file",
		"hidden",
		"image",
		"password",
		"radio",
		"reset",
		"submit",
		"text",
		"select",
		"textarea"
	],
	
	// Creates an input field.
	createInput: function(parent, type, options) {
		var id = Field.getInputId(options),
			css = type === "button" || type === "submit" || type === "reset" ? options.buttonCss : options.inputCss,
			input = document.createElement("input");
			
		input.id = id;
		input.name = id;
		input.className = css;
		input.type = type;
		
		if (type === "password" && options.passwordCss) {
			addClassName(input, options.passwordCss);
		}
		
		input.value = (options.value || "").toString();
		parent.appendChild(input);
		
		return input;
	},
	
	// Creates an input list field.
	createInputList: function(parent, type, options) {
		var i,
			n,
			id,
			span,
			label,
			name,
			input,
			inputs = [];
			
		if (options.items && options.items.length) {
			for(i = 0, n = options.items.length; i < n; i++) {
				id = Field.getInputId(options) + "_" + i;
				
				span = document.createElement("span");
				span.className = options.inputCss;
				
				label = document.createElement("label");
				label["for"] = id;
				label.innerHTML = options.items[i].text;
				
				name = options.group ? options.group : id;
				
				input = document.createElement("input");
				input.id = id;
				input.type = type;
				input.name = name;
				
				if (options.items[i].selected) {
					input.checked = "checked";
				}
				
				if (options.items[i].value) {
					input.value = options.items[i].value.toString();
				}
				
				if (options.itemsAlign === "right") {
					span.appendChild(input);
					span.appendChild(document.createTextNode("&nbsp;"));
					span.appendChild(label);
				} else {
					span.appendChild(label);
					span.appendChild(document.createTextNode("&nbsp;"));
					span.appendChild(input);
				}
				
				parent.appendChild(span);
				inputs.push(input);
			}
		}
		
		return inputs;
	},
	
	// Creates a select field.
	createSelectList: function(parent, type, options) {
		var i,
			n,
			id = Field.getInputId(options),
			select,
			index;
		
		select = document.createElement("select");
		select.id = id;
		select.name = id;
		select.className = options.inputCss;
		parent.appendChild(select);
		
		if (options.items && options.items.length) {
			index = -1;
			
			for(i = 0, n = options.items.length; i < n; i++) {
				select.options[i] = new Option(options.items[i].text, options.items[i].value);
				
				if (options[i].selected) {
					index = i;
				}
			}
			
			if (index > -1) {
				select.selectedIndex = index;
			}
		}
		
		return select;
	},
	
	// Creates a textarea field.
	createTextArea: function(parent, type, options) {
		var id = Field.getInputId(options),
			input = document.createElement("textarea");
			
		input.id = id;
		input.name = id;
		input.className = options.inputCss;
		input.value = (options.value || "").toString();
		parent.appendChild(input);
		
		return input;
	},
	
	// Gets an array from an enumeration value, optionally taking a hash of values
	// to use. Assumes the enumeration value is a combination of power-of-two values.
	// Map keys should be possible values (e.g., "1").
	getArrayFromEnum: function(value, map) {
		var array = [],
			i = 1,
			parsed;
		
		if (typeof value === "string") {
			parsed = parseInt(value, 10);
			value = !isNaN(parse) ? parsed : 0;
		}
		
		while(i <= value) {
			if ((i & value) === i) {
				if (map) {
					array.push(map[i.toString()]);
				} else {
					array.push(i);
				}
			}
			
			i = i * 2;
		}
		
		return array;
	},
	
	// Gets an enum value from an array of enum values to combine.
	getEnumFromArray: function(array) {
		var value = 0,
			indexValue,
			i,
			n;
		
		for(i = 0, n = array.length; i < n; i++) {
			indexValue = array[i];
			
			if (typeof indexValue === "string") {
				indexValue = parseInt(indexValue, 10);
				
				if (isNaN(indexValue)) {
					indexValue = undefined;
				}
			}
			
			if (typeof indexValue === "number") {
				value = value | indexValue;
			}
		}
		
		return value;
	},
	
	// Gets the ID of the input given the field ID defined in the given options hash.
	getInputId: function(options) {
		return options.id + "_input";
	}
});
//
// Creates dynamic forms.
//
Form = function(title, options) {
	title = title || "";
	options = extend({
		css: "wmd-form",
		legendCss: "wmd-legend",
		errorCss: "wmd-error",
		requiredReason: "Required",
		dialogCss: "wmd-dialog",
		dialog: false,
		modal: true,
		dialogZIndex: 10,
		closeOnEsc: true,
		id: "",
		onSubmit: null,
		onDestroy: null
	}, options);
	
	var element,
		events = [],
		fields = [],
		fieldset,
		error,
		dialog;
		
	if (!options.id) {
		options.id = randomString(6, {upper:false});
	}
	
	element = document.createElement("form");
	element.id = options.id;
	element.className = options.css;
	element.onsubmit = function() { 
		if (typeof options.onSubmit === "function") {
			options.onSubmit(element);
		}
		
		return false;
	};
	
	fieldset = document.createElement("fieldset");
	element.appendChild(fieldset);
	
	legend = document.createElement("div");
	legend.className = options.legendCss;
	legend.style.display = "none";
	fieldset.appendChild(legend);
	
	error = document.createElement("div");
	error.className = options.errorCss;
	error.style.display = "none";
	fieldset.appendChild(error);
	
	if (options.dialog) {
		dialog = new Dialog({
			modal: options.modal,
			zIndex: options.dialogZIndex,
			css: options.dialogCss,
			closeOnEsc: false,
			insertion: element
		});
	}
	
	addEvent(document, "keypress", function(event) {
		var e = event || window.event,
			keyCode = e.keyCode || e.which;

		switch(keyCode) {
			case(27):
				if (options.closeOnEsc) {
					element.destroy();
				}
				break;
			default:
				break;
		}
	}, events);
	
	/*
	 * Private functions.
	 */
	
	// Finds a field by key. Returns {field, index}.
	function findField(key) {
		var field = null,
			index = -1,
			i,
			n;
		
		for(i = 0, n = fields.length; i < n; i++) {
			if (fields[i].key === key) {
				field = fields[i].value;
				index = i;
				break;
			}
		}
		
		return {field:field, index:index};
	}
	
	// Removes a field from the field cache.
	function removeField(key) {
		var newFields = [],
			i,
			n;
			
		for(i = 0, n = fields.length; i < n; i++) {
			if (fields[i].key !== key) {
				newFields.push(fields[i]);
			}
		}
		
		fields = newFields;
	}
	
	/*
	 * Public members.
	 */
	
	extend(element, {
		// Adds a field to the end of the form.
		addField: function(key, field) {
			return this.insertField(-1, key, field);
		},
		
		// Destroys the form.
		destroy: function() {
			var i,
				n;
				
			if (typeof options.onDestroy === "function") {
				options.onDestroy(this);
			}
			
			while(events.length > 0) {
				removeEvent(events[0].element, events[0].event, events[0].callback, events);
			}
			
			for(i = 0, n = fields.length; i < n; i++) {
				if (fields[i].value) {
					if (typeof fields[i].value.destroy === "function") {
						fields[i].value.destroy();
					} else if (fields[i].value.parentNode) {
						fields[i].value.parentNode.removeChild(fields[i].value);
					}
					
					fields[i].value = null;
				}
			}
			
			fields = [];
			
			element.parentNode.removeChild(element);
			element = null;
			
			if (dialog) {
				dialog.destroy();
				dialog = null;
			}
			
			return this;
		},
		
		// Writes an error to the form's error container.
		error: function (message) {
			message = (message || "").toString();
			error.innerHTML = message;
			error.style.display = message ? "" : "none";
			
			// Redraw the dialog because Firefox is dumb with rounded corners.
			if (dialog) {
				dialog.redraw();
			}
			
			return this;
		},
		
		// Fills the form with the given object hash.
		fill: function(obj) {
			var prop;
			
			if (obj) {
				for(prop in obj) {
					if (obj.hasOwnProperty(prop)) {
						this.setValue(prop, obj[prop]);
					}
				}
			}
			
			return this;
		},
		
		// Focuses the first focus-able field in the form.
		focus: function() {
			var i,
				n;
				
			for(i = 0, n = fields.length; i < n; i++) {
				if (fields[i].value && typeof fields[i].value.focus === "function") {
					fields[i].value.focus();
					break;
				}
			}
			
			return this;
		},
		
		// Gets the form's dialog instance.
		getDialog: function() {
			return dialog;
		},
		
		// Gets the field with the specified key.
		getField: function(key) {
			var field = findField(key);
			return field ? field.value : null;
		},
		
		// Gets the value of the field with the specified key.
		getValue: function(key, primitives) {
			var field = findField(key);
			
			if (field && field.value && typeof field.value.getValue === "function") {
				return field.value.getValue(primitives);
			} else {
				return undefined;
			}
		},
		
		// Inserts a fields at the specified index.
		insertField: function(index, key, field) {
			this.removeField(key);
			
			if (index >= 0 && fields.length > index) {
				fields.splice(index, 0, {key:key, value:field});
				fields[index + 1].value.parentNode.insertBefore(field, fields[index + 1].value);
			} else {
				fields.push({key:key, value:field});
				fieldset.appendChild(field);
			}
			
			// Redraw the dialog because Firefox is dumb with rounded corners.
			if (dialog) {
				dialog.redraw();
			}
			
			return this;
		},
		
		// Removes a field from the fieldset by key.
		removeField: function(key) {
			var field = findField(key);
			
			if (field.value) {
				if (typeof field.value.destroy === "function") {
					field.value.destroy();
				} else if (field.value.parentNode) {
					field.value.parentNode.removeChild(field.value);
				}
				
				removeField(key);
			}
			
			// Redraw the dialog because Firefox is dumb with rounded corners.
			if (dialog) {
				dialog.redraw();
			}
			
			return this;
		},
		
		// Serializes the form into an object hash, optionally
		// stopping and highlighting required fields.
		serialize: function(ensureRequired, primitives) {
			var hash = {},
				missing = 0,
				field,
				value,
				type,
				i,
				n;

			for(i = 0, n = fields.length; i < n; i++) {
				field = fields[i].value;
				value = field.getValue(primitives);
				type = field.getType();
				
				if (type !== "empty" && type !== "submit" && type !== "reset" && type !== "button") {
					if (value !== "" && typeof value !== "undefined" && value !== null && value.length !== 0) {
						hash[fields[i].key] = value;
						field.error();
					} else if (ensureRequired && field.isRequired() && field.isVisible()) {
						missing = missing + 1;
						field.error(true, options.requiredReason);
					}
				}
			}
			
			// Redraw the dialog because Firefox is dumb with rounded corners.
			if (dialog) {
				dialog.redraw();
			}
			
			return missing === 0 ? hash : null;
		},
		
		// Sets the legend title.
		setTitle: function(title) {
			legend.innerHTML = title || "";
			legend.style.display = title ? "" : "none";
			
			return this;
		},
		
		// Sets a field's value.
		setValue: function(key, value) {
			var field = findField(key);
			
			if (field && field.value && typeof field.value.setValue === "function") {
				field.value.setValue(value);
			}
			
			return this;
		}
	});
	
	element.setTitle(title);
	return element;
};
//
// Represents a the state of the input at a specific moment.
//
InputState = function(wmd) {
	var obj = {},
		input = wmd.input;
		
	/*
	 * Public members.
	 */

	obj = extend(obj, {
		scrollTop: 0,
		text: "",
		start: 0,
		end: 0,
		
		// Gets a Chunk object from this state's text.
		getChunk:function() {
			return new Chunk(this.text, this.start, this.end, this.scrollTop);
		},

		// Restores this state onto its input.
		restore:function() {
			if (this.text !== input.value) {
				input.value = this.text;
			}

			this.setInputSelection();
			input.scrollTop = this.scrollTop;
		},

		// Sets the value of this state's text from a chunk.
		setChunk:function(chunk) {
			chunk.before = chunk.before + chunk.startTag;
			chunk.after = chunk.endTag + chunk.after;

			if (browser.Opera) {
				chunk.before = chunk.before.replace(/\n/g, "\r\n");
				chunk.selection = chunk.selection.replace(/\n/g, "\r\n");
				chunk.after = chunk.after.replace(/\n/g, "\r\n");
			}

			this.start = chunk.before.length;
			this.end = chunk.before.length + chunk.selection.length;
			this.text = chunk.before + chunk.selection + chunk.after;
			this.scrollTop = chunk.scrollTop;
		},

		// Sets this state's input's selection based on this state's start and end values.
		setInputSelection:function() {
			var range;

			if (visible(input)) {
				input.focus();

				if (input.selectionStart || input.selectionStart === 0) {
					input.selectionStart = this.start;
					input.selectionEnd = this.end;
					input.scrollTop = this.scrollTop;
				} else if (document.selection) {
					if (!document.activeElement || document.activeElement === input) {
						range = input.createTextRange();

						range.moveStart("character", -1 * input.value.length);
						range.moveEnd("character", -1 * input.value.length);
						range.moveEnd("character", this.end);
						range.moveStart("character", this.start);

						range.select();
					}
				}
			}
		},

		// Sets this state's start and end selection values from the input.
		setStartEnd:function() {
			var range,
				fixedRange,
				markedRange,
				rangeText,
				len,
				marker = "\x07";
				
			if (visible(input)) {
				if (input.selectionStart || input.selectionStart === 0) {
					this.start = input.selectionStart;
					this.end = input.selectionEnd;
				} else if (document.selection) {
					this.text = fixEol(input.value);

					// Fix IE selection issues.
					if (wmd.ieClicked && wmd.ieRange) {
						range = wmd.ieRange;
						wmd.ieClicked = false;
					} else {
						range = document.selection.createRange();
					}

					fixedRange = fixEol(range.text);
					markedRange = marker + fixedRange + marker;
					range.text = markedRange;
					rangeText = fixEol(input.value);

					range.moveStart("character", -1 * markedRange.length);
					range.text = fixedRange;

					this.start = rangeText.indexOf(marker);
					this.end = rangeText.lastIndexOf(marker) - marker.length;

					len = this.text.length - fixEol(input.value).length;

					if (len > 0) {
						range.moveStart("character", -1 * fixedRange.length);

						while(len > 0) {
							fixedRange = fixedRange + "\n";
							this.end = this.end + 1;
							len = len - 1;
						}

						range.text = fixedRange;
					}

					this.setInputSelection();
				}
			}
		}
	});
	
	/*
	 * Perform construction.
	 */
	
	if (visible(input)) {
		input.focus();
		obj.setStartEnd();
		obj.scrollTop = input.scrollTop;

		if (input.selectionStart || input.selectionStart === 0) {
			obj.text = input.value;
		}
	}
	
	return obj;
};
//
// Provides static function for helping with managing
// links in a WMD editor.
//
LinkHelper = {
	// Adds a link definition to the given chunk.
	add: function(chunk, linkDef) {
		var refNumber = 0,
			defsToAdd = {},
			defs = "",
			regex = /(\[(?:\[[^\]]*\]|[^\[\]])*\][ ]?(?:\n[ ]*)?\[)(\d+)(\])/g;
			
		function addDefNumber(def) {
			refNumber = refNumber + 1;
			def = def.replace(/^[ ]{0,3}\[(\d+)\]:/, "  [" + refNumber + "]:");
			defs += "\n" + def;
		}
		
		function getLink(totalMatch, link, id, end) {
			var result = "";
			
			if (defsToAdd[id]) {
				addDefNumber(defsToAdd[id]);
				result = link + refNumber + end;
			} else {
				result = totalMatch;
			}
			
			return result;
		}
		
		// Start with a clean slate by removing all previous link definitions.
		chunk.before = LinkHelper.strip(chunk.before, defsToAdd);
		chunk.selection = LinkHelper.strip(chunk.selection, defsToAdd);
		chunk.after = LinkHelper.strip(chunk.after, defsToAdd);
		
		chunk.before = chunk.before.replace(regex, getLink);
		
		if (linkDef) {
			addDefNumber(linkDef);
		} else {
			chunk.selection = chunk.selection.replace(regex, getLink);
		}

		chunk.after = chunk.after.replace(regex, getLink);
		
		if (chunk.after) {
			chunk.after = chunk.after.replace(/\n*$/, "");
		}
		
		if (!chunk.after) {
			chunk.selection = chunk.selection.replace(/\n*$/, "");
		}
		
		chunk.after = chunk.after + "\n\n" + defs;
		
		return refNumber;
	},
	
	// Creates a dialog that prompts the user for a link URL.
	createDialog: function(formTitle, fieldLabel, callback) {
		var form,
			urlField,
			submitted = false;
			
		callback = typeof callback === "function" ? callback : function() { };

		form = Command.createSubmitCancelForm(formTitle, function() {
			var values = form.serialize(true);
			
			if (values) {
				submitted = true;
				form.destroy();
			
				callback(values.url);
			}
		}, function() {
			if (!submitted) {
				callback("");
			}
		});
		
		urlField = new Field(fieldLabel, "text", {
			required: true,
			value: "http://",
			insertion: Translator.urlFieldInsertion
		});
		
		form.insertField(0, "url", urlField);
		urlField.focus();
	},
	
	// Strips and caches links from the given text.
	strip: function(text, defsToAdd) {
		var expr = /^[ ]{0,3}\[(\d+)\]:[ \t]*\n?[ \t]*<?(\S+?)>?[ \t]*\n?[ \t]*(?:(\n*)["(](.+?)[")][ \t]*)?(?:\n+|$)/gm;
		
		text = text.replace(expr, function(totalMatch, id, link, newLines, title) {
			var result = "";
			
			defsToAdd[id] = totalMatch.replace(/\s*$/, "");
			
			if (newLines) {
				defsToAdd[id] = totalMatch.replace(/["(](.+?)[")]$/, "");
				result = newLines + title;
			}
			
			return result;
		});
		
		return text;
	}
};
Translator_EN = {
    urlFieldInsertion: "<span class=\"note\">To add a tool-tip, place it in quotes after the URL (e.g., <strong>http://google.com \"Google\"</strong>)</span>",
    linkText: "link text",
    imageAlt: "image alt",
    listItem: "List item",
    
    strongTitle: "Strong <strong> Ctl+B",
    emTitle: "Emphasis <em> Ctl+I",
    aTitle: "Hyperlink <a> Ctl+L",
    blockquoteTitle: "Blockquote <blockquote> Ctl+Q",
    codeTitle: "Code Sample <pre><code> Ctl+K",
    imgTitle: "Image <img> Ctl+G",
    olTitle: "Numbered List <ol> Ctl+O",
    ulTitle: "Bulleted List <ul> Ctl+U",
    hTitle: "Heading <h1>/<h2> Ctl+H",
    hrTitle: "Horizontal Rule <hr> Ctl+R",
    
    strongText: "Bold",
    emText: "Italic",
    aText: "Link",
    blockquoteText: "Blockquote",
    codeText: "Code",
    imgText: "Image",
    olText: "Numbered List",
    ulText: "Bulleted List",
    hText: "Heading",
    hrText: "Horizontal Rule",   
    
    insertImage: "Insert image",
    imageURL: "Image URL",
    enterCodeHere: "enter code here",
    blockquote: "Blockquote",
    insertLink: "Insert link",
    linkURL: "Link URL",
    
    submit: "Submit",
    cancel: "Cancel"
};

Translator_RU = {
    urlFieldInsertion: "<span class=\"note\">(например, <strong>http://google.com</strong>)</span>",
    linkText: "название ссылки",
    imageAlt: "описание картинки",
    listItem: "текст",
    
    strongTitle: "Жирный <strong> Ctl+B",
    emTitle: "Курсив <em> Ctl+I",
    aTitle: "Вставить ссылку <a> Ctl+L",
    blockquoteTitle: "Цитировать <blockquote> Ctl+Q",
    codeTitle: "Вставить пример кода <pre><code> Ctl+K",
    imgTitle: "Вставить картинку <img> Ctl+G",
    olTitle: "Нумерованный список <ol> Ctl+O",
    ulTitle: "Маркированный список <ul> Ctl+U",
    hTitle: "Вставить заголовок <h1>/<h2> Ctl+H",
    hrTitle: "Горизонтальная черта <hr> Ctl+R",
    
    strongText: "Bold",
    emText: "Italic",
    aText: "Link",
    blockquoteText: "Blockquote",
    codeText: "Code",
    imgText: "Image",
    olText: "Numbered List",
    ulText: "Bulleted List",
    hText: "Heading",
    hrText: "Horizontal Rule",   
    
    insertImage: "Вставить картинку",
    imageURL: "Адрес картинки",
    enterCodeHere: "вставьте код сдесь",
    blockquote: "текст цитаты",
    insertLink: "Вставить ссылку",
    linkURL: "Ссылка",
    
    submit: "Ок",
    cancel: "Отмена"
};

Translator = Translator_EN;

function chooseTranslator(lang)
{
    if(lang == "RU")
        Translator = Translator_RU;
    else
        Translator = Translator_EN;
    
    //small hack
    Command.builtIn = {
	"strong": {text:Translator.strongText, title:Translator.strongTitle, css:"wmd-strong", shortcut:"b"},
	"em": {text:Translator.emText, title:Translator.emTitle, css:"wmd-em", shortcut:"i"},
	"a": {text:Translator.aText, title:Translator.aTitle, css:"wmd-a", shortcut:"l"},
	"blockquote": {text:Translator.blockquoteText, title:Translator.blockquoteTitle, css:"wmd-blockquote", shortcut:"q"},
	"code": {text:Translator.codeText, title:Translator.codeTitle, css:"wmd-code", shortcut:"k"},
	"img": {text:Translator.imgText, title:Translator.imgTitle, css:"wmd-img", shortcut:"g"},
	"ol": {text:Translator.olText, title:Translator.olTitle, css:"wmd-ol", shortcut:"o"},
	"ul": {text:Translator.ulText, title:Translator.ulTitle, css:"wmd-ul", shortcut:"u"},
	"h": {text:Translator.hText, title:Translator.hTitle, css:"wmd-h", shortcut:"h"},
	"hr": {text:Translator.hrText, title:Translator.hrTitle, css:"wmd-hr", shortcut:"r"},
	"spacer": {css:"wmd-spacer", builder:Command.createSpacer}
    };
};



// "Global" variable declarations.
var WMD,
	Chunk,
	InputState,
	Command,
	Dialog,
	Overlay,
	Form,
	Field,
	LinkHelper,
        Translator,
	documentElement,
	eventCache = [],
	browser = {
		IE: !!(window.attachEvent && !window.opera),
		Opera: !!window.opera,
		WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1
	};
	
//
// Constructor. Creates a new WMD instance.
//
WMD = function(input, toolbar, options) {
	options = extend({
		preview: null,
		previewEvery: .5,
		showdown: null,
		lineLength: 40,
		commands: "strong em a blockquote code img ol ul h hr",
		commandTable: {},
                lang: "EN"
	}, options);
        
        chooseTranslator(options.lang);

	if (typeof input === "string") {
		input = document.getElementById(input);
	}
	
	if (typeof toolbar === "string") {
		toolbar = document.getElementById(toolbar);
	}
	
	var obj = {},
		shortcuts = {},
		previewInterval,
		lastValue = "";
		
	// Try and default showdown if necessary.
	if (!options.showdown && typeof Attacklab !== "undefined" && Attacklab.showdown && Attacklab.showdown.converter) {
		options.showdown = new Attacklab.showdown.converter().makeHtml;
	}
	
	/*
	 * Private members.
	 */
	
	// Builds the toolbar.
	function buildToolbar() {
		var ul,
			i,
			key,
			definition,
			builder,
			command,
			commands = options.commands.split(" ");

		if (toolbar) {
			toolbar.innerHTML = "";
			ul = document.createElement("ul");
			ul.className = "wmd-toolbar";
			toolbar.appendChild(ul);
		
			for(i = 0; i < commands.length; i = i + 1) {
				key = commands[i];
				definition = null;
				command = null;
				builder = Command.create;
			
				if (options.commandTable[key]) {
					definition = options.commandTable[key];
				} else if (Command.builtIn[key]) {
					definition = Command.builtIn[key];
				}
			
				if (definition) {
					if (definition.builder && typeof definition.builder === "function") {
						builder = definition.builder;
					}

					command = builder(obj, key, definition);
					
					if (definition.shortcut && typeof definition.shortcut === "string") {
						shortcuts[definition.shortcut.toLowerCase()] = command.run;
					}
					
					command.draw(ul);
				}
			}
		}
	}
	
	// Creates the global events.
	function createEvents() {
		var onSubmit;
		
		// Command shortcuts.
		addEvent(input, browser.Opera ? "keypress" : "keydown", function(event) {
			var ev = event || window.event,
				keyCode = ev.keyCode || ev.which,
				keyChar = String.fromCharCode(keyCode).toLowerCase();

			if (ev.ctrlKey || ev.metaKey) {
				if (shortcuts[keyChar] && typeof shortcuts[keyChar] === "function") {
					shortcuts[keyChar]();
					
					if (ev.preventDefault) {
						ev.preventDefault();
					}
					
					if (window.event) {
						window.event.returnValue = false;
					}

					return false;
				}
			}

            if(keyCode === 9) { // tab was pressed
                var newCaretPosition;
                newCaretPosition = this.selectionStart + "    ".length;
                this.value = this.value.substring(0, this.selectionStart) + "    " + this.value.substring(this.selectionStart, this.value.length);
                this.selectionStart = newCaretPosition;
                this.selectionEnd = newCaretPosition;
                this.focus();

                if (ev.preventDefault) {
                    ev.preventDefault();
                } else {
                    ev.returnValue = false;
                }
                return false;
            }
		});
		
		// Auto-continue lists, code blocks and block quotes when "Enter" is pressed.
		addEvent(input, "keyup", function(event) {
			var ev = event || window.event,
				keyCode = ev.keyCode || ev.which,
				meta = ev.shiftKey || ev.ctrlKey || ev.metaKey,
				state,
				chunk;
			
			if (!meta && keyCode === 13) {
				state = new InputState(obj);
				chunk = state.getChunk();

				Command.autoIndent(obj, chunk, function() {
					state.setChunk(chunk);
					state.restore();
				});
			}
		});
		
		// Prevent ESC from clearing the input in IE.
		if (browser.IE) {
			addEvent(input, "keypress", function(event) {
				var ev = event || window.event,
					keyCode = ev.keyCode || ev.which;
				
				if (keyCode === 27) {
					ev.returnValue = false;
					return false;
				}
			});
		}
		
		// Preview?
		if (options.preview && options.previewEvery > 0 && typeof options.showdown === "function") {
			if (typeof options.preview === "string") {
				options.preview = document.getElementById(options.preview);
			}
			
			function refreshPreview() {
				if (input.value !== lastValue) {
					options.preview.innerHTML = options.showdown(input.value);
					lastValue = input.value;
				}
			}

			previewInterval = setInterval(refreshPreview, options.previewEvery * 1000);
			addEvent(input, "keypress", refreshPreview);
			addEvent(input, "keydown", refreshPreview);
		}
	}
	
	// Run the setup.
	buildToolbar();
	createEvents();
	
	/*
	 * Public members.
	 */
	
	return extend(obj, {
		input: input,
		options: options,
		ieClicked: false,
		ieRange: null
	});
};

/*
 * Utility functions.
 */

// Adds a CSS class name to an element if it isn't already defined on the element.
function addClassName(element, className) {
	var elementClassName = element.className;
	
	if (!(elementClassName.length > 0 && (elementClassName === className || new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)))) {
		element.className = element.className + (element.className ? " " : "") + className;
	}
	
	return element;
}

// Adds an event listener to a DOM element.
function addEvent(element, event, callback, cache) {
	if (element.attachEvent) { // IE.
		element.attachEvent("on" + event, callback);
	} else { // Everyone else.
		element.addEventListener(event, callback, false);
	}
	
	if (cache && typeof cache.push === "function") {
		cache.push({element:element, event:event, callback:callback});
	} else {
		eventCache.push({element:element, event:event, callback:callback});
	}
}

// Extends a destination object by the source object.
function extend(dest, source) {
	source = source || {};
	dest = dest || {};
	
	var prop;
	
	for(prop in source) {
		if (source.hasOwnProperty(prop) && typeof source[prop] !== "undefined") {
			dest[prop] = source[prop];
		}
	}
	
	return dest;
}

// Extends a regular expression by prepending and/or appending to
// its pattern.
function extendRegExp(regex, pre, post) {
	var pattern = regex.toString(),
		flags = "",
		result;
		
	if (pre === null || pre === undefined)
	{
		pre = "";
	}
	
	if(post === null || post === undefined)
	{
		post = "";
	}

	// Replace the flags with empty space and store them.
	// Technically, this can match incorrect flags like "gmm".
	result = pattern.match(/\/([gim]*)$/);
	
	if (result) {
		flags = result[1];
	} else {
		flags = "";
	}
	
	// Remove the flags and slash delimiters from the regular expression.
	pattern = pattern.replace(/(^\/|\/[gim]*$)/g, "");
	pattern = pre + pattern + post;
	
	return new RegExp(pattern, flags);
}

// Normalizes line endings into just "\n".
function fixEol(text) {
	return (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

// Gets the dimensions of the current viewport.
function getViewportDimensions() {
	if (!documentElement) {
		if (browser.WebKit && !document.evaluate) {
			documentElement = document;
		} else if (browser.Opera && window.parseFloat(window.opera.version()) < 9.5) {
			documentElement = document.body;
		} else {
			documentElement = document.documentElement;
		}
	}
	
	return {width:documentElement.clientWidth, height:documentElement.clientHeight};
}

// Gets the index of the given element in the given array.
function indexOf(array, item) {
	var i, n;
	
	if (array) {
		if (typeof array.indexOf !== "undefined") {
			return array.indexOf(item);
		}
		
		if (typeof array.length !== "undefined") {
			for(i = 0, n = array.length; i < n; i++) {
				if (array[i] === item) {
					return i;
				}
			}
		}
	}
	
	return -1;
}

// Generates a random string.
function randomString(length, options) {
	options = extend({
		numbers: false,
		lower: true,
		upper: true,
		other: false
	}, options);

	var numbers = "0123456789";
	var lower = "abcdefjhijklmnopqrstuvwxyz";
	var upper = "ABCDEFJHIJKLMNOPQRSTUVWXYZ";
	var other = "`~!@#$%^&*()-_=+[{]}\\|;:'\",<.>/?";
	var charset = "", str = "";
	
	if (options.numbers) { 
	    charset += numbers;
	}
	
	if (options.lower) {
	    charset += lower;
	}
	
	if (options.upper) {
	    charset += upper;
	}
	
	if (options.other) { 
	    charset += other;
       }
       
	if (charset.length === 0) {
		throw("There is no character set from which to generate random strings.");
	}

	function getCharacter() {
		return charset.charAt(getIndex(0, charset.length));
	}

	function getIndex(lower, upper) {
		return Math.floor(Math.random() * (upper - lower)) + lower;
	}

	for(var i = 0; i < length; i++) {
		str += getCharacter();
	}

	return str;
}

// Removes a CSS class name from an element.
function removeClassName(element, className) {
	element.className = element.className
		.replace(new RegExp("(^|\\s+)" + className + "(\\s+|$)"), " ")
		.replace(/^\s+/, "")
		.replace(/\s+$/, "");
		
	return element;
}

// Removes an event listener from a DOM element.
function removeEvent(element, event, callback, cache) {
	var cached = null, 
		i = 0;
		
	cache = (cache && typeof cache.push === "function") ? cache : eventCache;
	
	for(; i < cache.length; i++) {
		if (cache[i].element === element &&
			cache[i].event === event &&
			cache[i].callback === callback) {
			cached = cache[i];
			break;
		}
	}
	
	if (element.detachEvent) { // IE.
		element.detachEvent("on" + event, callback);
	} else { // Everyone else.
		element.removeEventListener(event, callback, false); 
	}
	
	if (cached) {
		cache.splice(indexOf(cache, cached), 1);
	}
}

// Gets a value indicating whether an element is visible.
function visible(element) {
	var v = true;
	
	if (window.getComputedStyle) {
		v = window.getComputedStyle(element, null).getPropertyValue("display") !== "none";
	} else if (element.currentStyle) {
		v = element.currentStyle["display"] !== "none";
	}
	
	return v;
}

// Kill all cached events on window unload.
addEvent(window, "unload", function() {
	while(eventCache.length > 0) {
		removeEvent(eventCache[0].element, eventCache[0].event, eventCache[0].callback);
	}
});

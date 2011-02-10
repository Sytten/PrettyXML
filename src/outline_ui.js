/**
 * UI for global outline
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "utils.js"
 * @include "dom.js"
 * @include "outline.js"
 * @include "renderer.js"
 */
(function(){
	/** @type {Element} Outline pane */
	var pane,
		/** @type {Element} XML source pane */
		source_pane,
		/** @type {Element} */
		pane_content,
		/** @type {Element} */
		resize_handler,
		
		/** Cache for rendered nodes */
		rendered_nodes = {},
		
		selected_elem,
		
		ss,
		ss_inserted = false;
		
	function resizeOutline(width) {
		width = Math.round(Math.max(120, Math.min(window.innerWidth * 0.5, width)));
		if (pane.style) {
			// normal browser – just update style
			xv_dom.setCSS(pane, {width: width});
			xv_dom.setCSS(source_pane, {right: width});
		} else {
			// Freakin' crazy way to update XML element style:
			// modify document’s stylesheet with new rules.
			// Don‘t do this on your web-sites!
			if (!ss) ss = locateStylesheet();
			if (ss) {
				if (ss_inserted) {
					// remove first two rules
					ss.removeRule(0);
					ss.removeRule(0);
				}
				
				// insert new rules
				ss.insertRule('div[class~=xv-source-pane]{right:' + width + 'px !important}');
				ss.insertRule('div[class~=xv-outline]{width:' + width + 'px !important}');
				ss_inserted = true;
			}
		}
	}
	
	/**
	 * Highlight element
	 * @param {jQuery} element
	 */
	function highlightElement(elem, no_signal) {
		if (selected_elem && selected_elem != elem)
			xv_dom.removeClass(selected_elem, 'xv-outline-node-selected');
			
		selected_elem = elem;
		xv_dom.toggleClass(selected_elem, 'xv-outline-node-selected');
		
		if (!no_signal)
			xv_signals.nodeFocused.dispatch(xv_renderer.getOriginalNode(selected_elem), 'outline');
	}
	
	/**
	 * @return {CSSStyleSheet}
	 */
	function locateStylesheet() {
		var stylesheet = _.detect(document.childNodes, function(n){
			return 'sheet' in n;
		});
		
		return stylesheet ? stylesheet.sheet : null;
	}
	
	function attachResizeEvents() {
		if (resize_handler) {
			var is_dragging = false,
				mouse_x,
				prev_width;
				
			xv_dom.addEvent(resize_handler, 'mousedown', function(evt) {
				is_dragging = true;
				mouse_x = evt.pageX;
				prev_width = pane.offsetWidth;
				evt.preventDefault();
			});
			
			xv_dom.addEvent(document, 'mouseup', function(evt) {
				is_dragging = false;
			});
			
			xv_dom.addEvent(document, 'mousemove', function(evt) {
				if (is_dragging) {
					var dx = evt.pageX - mouse_x;
					resizeOutline(prev_width - dx);
				}
			});
		}
	}
	
	/**
	 * Check if element contains unprocessed child nodes
	 * @param {Element} elem
	 * @return {Boolean}
	 */
	function hasUnprocessedChildren(elem) {
		return xv_dom.hasClass(elem, 'xv-has-unprocessed');
	}
	
	/**
	 * Expand node
	 * @param {Element|jQuery} elem Node to expand
	 * @param {Boolean} is_recursive Recursively expand all child nodes
	 */
	function expandNode(elem, is_recursive) {
		if (!xv_dom.hasClass(elem, 'xv-collapsed')) // additional check for recursive calls
			return;
		
		// check if current node has unprocessed children
		xv_dom.removeClass(elem, 'xv-collapsed');
		if (hasUnprocessedChildren(elem)) {
			// render all first-level child nodes
			var orig_elem = xv_renderer.getOriginalNode(elem),
				/** @type {Element} */
				cur_child = _.detect(elem.childNodes, function(n) {
					return n.nodeType == 1 && xv_dom.hasClass(n, 'xv-outline-tag-children');
				});
				
			var f = document.createDocumentFragment();
			_.each(orig_elem.childNodes, function(n) {
				var r = xv_outline.render(n, 0);
				if (r) f.appendChild(r);
			});
			
			xv_dom.empty(cur_child);
			cur_child.appendChild(f);
			xv_dom.removeClass(elem, 'xv-has-unprocessed');
		}
		
		if (is_recursive) {
			_.each(xv_dom.getByClass('xv-collapsed', elem), function(n) {
				expandNode(n, is_recursive);
			});
		}
	}
	
	/**
	 * Returns rendered node for original one
	 * @param {Element} orig_node
	 * @return {Element} Pointer to rendered node
	 */
	function getRenderedNode(orig_node) {
		var id = xv_renderer.getId(orig_node);
		
		if (!(id in rendered_nodes)) {
			_.detect(xv_dom.getByClass('xv-node', pane), function(n) {
				if (xv_renderer.getId(n) == id) {
					rendered_nodes[id] = n;
					return true;
				}
			});
		}
		
		return rendered_nodes[id];
	}
	
	// listen to signals
	xv_signals.documentProcessed.addOnce(function() {
		xv_dom.addEvent(document, 'click', function(/* Event */ evt) {
			if (xv_dom.hasClass(evt.target, 'xv-tag-switcher'))
				return;
				
			var elem = xv_dom.bubbleSearch(evt.target, 'xv-outline-node');
			if (elem) {
				highlightElement(elem);
			}
		});
	});
	
	xv_signals.nodeFocused.add(function(/* Element */ node, /* String */ source) {
		// handle focused node
		if (source != 'outline') {
			// create list of nodes to expand
			var node_list = [], n = node;
			do {
				if (n.nodeType == 1)
					node_list.push(n);
			} while (n = n.parentNode);
			
			// expand each node, from top to bottom
			node_list.reverse();
			_.each(node_list, function(n) {
				expandNode(getRenderedNode(n));
			});
			
			var cur_node = getRenderedNode(node);
			highlightElement(cur_node, true);
			if ('scrollIntoViewIfNeeded' in cur_node)
				cur_node.scrollIntoViewIfNeeded();
			else
				cur_node.scrollIntoView();
		}
	});
	
	xv_signals.documentProcessed.add(function(render_tree, original_tree) {
		if (!pane) {
			pane = xv_dom.fromHTML('<div class="xv-outline">' +
					'<div class="xv-outline-inner"></div>' +
					'<div class="xv-outline-rs-handler"></div>' +
					'</div>');
					
			pane_content = xv_dom.getOneByClass('xv-outline-inner', pane);
			resize_handler = xv_dom.getOneByClass('xv-outline-rs-handler', pane);
			
			source_pane = xv_dom.getOneByClass('xv-source-pane');
			source_pane.parentNode.appendChild(pane);
			setTimeout(function() {
				resizeOutline(pane.offsetWidth);
			});
		}
			
		if (pane) {
			xv_dom.empty(pane_content);
			pane_content.appendChild(xv_outline.render(original_tree, -1));
		}
		
		attachResizeEvents();
		
	});
	
})();
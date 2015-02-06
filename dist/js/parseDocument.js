var headers = [];
var port = chrome.runtime.connect({name: "parser"});
var class_selector = '';
var parent_selector = '';
var node_selector = '';
var prev_level = [$('body')];
var more_information = null;

//Also we are going to do everything with an FSM to help keep track of
//everything
var fsm = StateMachine.create({
  initial: 'capturing_headers',
  events: [
    { name: 'stop', from: ['capturing_headers', 'verify', 'capturing_class', 'fix_capture'], to: 'stop_save' },
    { name: 'get_more_information', from: 'capturing_headers', to: 'capturing_class' },
    { name: 'send_verification', from: 'capturing_headers', to: 'verify' },
    { name: 'send_verification', from: 'capturing_class', to: 'verify' },
    { name: 'confirm', from: 'verify', to: 'guess_headers' },
    { name: 'reject', from: 'verify', to: 'fixing_capture' },
    { name: 'done_fixing', from: 'fix_capture', to: 'guess_headers' },
    { name: 'confirm', from: 'verify', to: 'capturing_parent' }
  ],
  callbacks : {
    onstop: function(event, from, to) {
      document.removeEventListener("click", captureHeaders, true);
      window.location.reload();
    },
    onsend_verification: function(event, from, to) {
      port.postMessage({command: 'verify'});
    },
    onreject: function(event, from, to) {
      port.postMessage({command: 'redo'});
    },
    onget_more_information: function(event, from, to) {
      port.postMessage({command: 'info'});
    },
    onconfirm: function(event, from, to) {
      //Take the previous headers, and set them to the prev_level
      prev_level = headers;
      storeData();
      headers = [];
      return StateMachine.ASYNC;
    },
    onguess_headers: function(event, from, to) {
      post.postMessage({command: 'subheaders'});
    }
  }
});

/*
 * Method that overrides all click events for the page currently selected. It is the
 * function that performs the actual header capturing
 */
function captureHeaders(e) {
  e.stopPropagation();
  e.preventDefault();

  switch (true) {
    case fsm.is('capturing_headers'):
      var clicked = $(e.target);
      clicked.css('background-color', '#CEEDF5');

      if(/H[1-6]/.test(e.target.nodeName)) {
        //OK we are dealing with proper header elements
        //try to identify the rest of them
        node_selector = e.target.nodeName.toLowerCase();
        //Search each node listed in the previous level
        $.each(prev_level, function(idx) {
          var nodes = $(this).find(e.target.nodeName);
          nodes.css('background-color', '#CEEDF5');
          headers.push({children: nodes.toArray(), parent: this});
        });
        fsm.send_verification();
      } else if ( e.target.className =! "" ) {
        //ok there is a class assigned to the element -- we 
        //can use this for identification
        more_information = e.target;
        node_selector = e.target.nodeName.toLowerCase();
        fsm.get_more_information();
      } else {
        //OK we are dealing with other types of nodes -- lets try to identify
        //two and then find a common header
        node_selector = e.target.nodeName.toLowerCase();
        more_information = e.target; 
        fsm.get_more_information();
      }
      break;
    case fsm.is('capturing_class'):
      var classes = more_information.className.split(" ");
      var retVal = [];
      $.each(e.target.className.split(" "), function (idx) {
        if (classes.indexOf(this) > 0) {
          retVal.push(this);
        }
      });
      if (retVal.length > 0) {
        $.each(prev_level, function(idx) {
          var nodes = $(this).find("." + retVal.join(" ."))
          nodes.css('background-color', '#CEEDF5');
          headers.push({this: nodes.toArray()});
        });
        fsm.send_verification();
      }
      break;
    case fsm.is('determining_parent_node')
      var elem = e.target;
      var parents = commonParents([more_information, elem]);
      
      break;
    case fsm.is('fixing_capture'):
      var elem = null;
      for (var i = 0; i < headers.length; i++){
        if(headers[i] === e.target){
          elem = e.target;
          $(e.target).css('background-color','');
          headers.splice(i,1);
          break;
        }
      }
      //We didn't remove anything -- we must be adding
      //If we removed -- should we bother with trying to find the common ancestor?
      if (elem == null) {
        $(e.target).css('background-color','#CEEDF5');
        headers.push(e.target);
        //TODO figure out this logic -- not really sure what it could be?
      }
      break;
    case fsm.is('capturing_parent'):
      var preNode = headers[0];
      var parent = $(e.target).parents().has(preNode).first();
      break;
  }
}

document.addEventListener("click", captureHeaders, true);

/*
 * Store the data we captured from the content script to the background page
 */
function storeData() {
  var ret = [];
  //Create a nice serialized array
  $.each(headers, function(idx) {
    var parent = { name: $(this.parent)[0].nodeName.toLowerCase(),
                   content: $(this.parent).text(),
                   classes: $(this.parent)[0].className.split(' ')
                 };
    var children = [];
    //We only do one round of parent + children (not a lot of nesting yet)
    $.each(this.children, function(idx) {
      children.push({name: this.nodeName.toLowerCase(), classes: this.className.split(' '), content: $(this).text()});
    });
    parent.children = children;
    ret.push(parent);
  });
  port.postMessage({command: 'store', data: ret});
}

/*
 * Helper function to generate a unique ID
 */
function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

/*
 * Find the common parents in an array of DOM nodes
 *
 * @nodes array of nodes we want to find a common parent for
 */
function commonParents(nodes) {
  if (!(nodes instanceof Array) || nodes.length < 1){
    return [];
  }
  var arr = nodes.slice();
  if (nodes.length == 1){
    return $(nodes[0]).parents();
  } else {
    var elem = nodes[0];
    arr.splice(0,1);
    return commonParents(arr).has(elem);
  }
}


/*
 * Responses from the background page (the responses to notifications mostly)
 */
port.onMessage.addListener(function(msg) {
  switch (msg.command) {
    case 'verify':
      if (msg.response == 'yes') {
        fsm.confirm();
      } else {
        fsm.reject();
      }
      break;
    case 'fixing':
      if (msg.reponse == 'done') {
        fsm.confirm();
      }
      break;
    case 'doneStoring':
      fsm.transition();
      break;
  }
});

/*
 * General Messages from the extension -- currently used only to stop the collection
 * if we switch to a new page
 */
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    switch(request.command) {
      case 'stop':
        sendResponse({status: 'stopped'});
        fsm.stop();
        break;
    }
  });

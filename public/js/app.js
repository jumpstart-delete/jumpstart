'use strict';

$('#goback').on('click', backButton)
function backButton() {
  window.history.back();
}


////button for new superagent call///
$('#museButton').on('click', museButtons)
function museButtons(e) {
  e.preventDefault();
  $('main').empty();
  $.ajax('/muse', {method: 'GET', datatype: "JSON"})
    .then(result => {
      result.map(value => {
        let resultData = new Data(value);
        console.log(resultData)
        let renderData = resultData.render();
        $('.new-data').append(renderData);
      })
    })
}

$('#githubButton').on('click', githubButton)
function githubButton(e) {
  e.preventDefault();
  $('main').empty();
  $.ajax('/github', {method: 'GET', datatype: "JSON"})
    .then(result => {
      result.map(value => {
        let resultData = new Data(value);
        console.log(resultData)
        let renderData = resultData.render();
        $('.new-data').append(renderData);
      })
    })
}

////// constructor from backpage/////
function Data (obj) {
  this.title =obj.title;
  this.location = obj.location;
  this.company = obj.company;
  this.summary = obj.summary;
  this.url = obj.url;
  this.skill = obj.skill;
}
///// prototype for rendering/////
Data.prototype.render = function () {
  const source = $('#data-handle-card').html();
  let template = Handlebars.compile(source);
  return template(this)
}

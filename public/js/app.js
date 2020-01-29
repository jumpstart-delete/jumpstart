'use strict';

$('#goback').on('click', backButton)
function backButton() {
  window.history.back();
}

let click = 0;
let total = Math.floor(($('section').length)/6);
console.log(total)
/////////next page/////

function hideSet(num, until) {
  for (let i = num; i < until; i++) {
    $(`.data-card${i}`).hide()
  }
}

function showSet(num) {
  for (let i = num; i < $('section').length; i++) {
    $(`.data-card${i}`).show()
  }
}

///////////button effect/////////////
$('.buttonon').on('click', buttonEffect)
function buttonEffect(e) {
  e.preventDefault();
  let value = $(this).val()
  if (value === 'next') {
    click++
  } else if (value === 'previous') {
    click--
  }
  if (click === 0) {
    $('#hide-button').hide()
    showSet(0)
    hideSet(6, $('section').length);
  } else if (click === 1) {
    $('#hide-button').show()
    showSet(6)
    hideSet(0, 6)
    hideSet(12, $('section').length)
  } else if (click === 2) {
    showSet(12)
    hideSet(0, 12)
    hideSet(18, $('section').length)
  } else if (click === 3) {
    showSet(18)
    hideSet(0, 18)
    hideSet(24, $('section').length)
  } else if (click === 4) {
    showSet(24);
    hideSet(0,24);
    hideSet(30, $('section').length);
  } else if (click === 5) {
    showSet(30);
    hideSet(0,30);
    hideSet(36,$('section').length);
  } else if (click === 6) {
    showSet(36);
    hideSet(0,36);
  }
}

$('#hide-button').hide()
hideSet(6, $('section').length);

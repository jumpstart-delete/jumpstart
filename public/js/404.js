'use strict';

const goBackButton = document.getElementById('404-go-back');

goBackButton.addEventListener('click', goBack);

function goBack() {
  window.history.back();
}

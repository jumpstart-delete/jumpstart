/* eslint-disable indent */
'use strict';

// function generateDropDown() {
//   const selectEl = $('#select');
//   keywordArray.forEach(keyword => {
//     const $optionEl = $(`<option value=${keyword}>${keyword}</option>`)
//     selectEl.append($optionEl);
//   })
// }

$('#select-tag').on('change', filterData)
function filterData(e) {
  e.preventDefault();
  let select = $(this).val();
   $(`section`).hide();  
   $(`.${select}`).show();
   if (select === 'default') {
    $(`section`).show();
   }
}

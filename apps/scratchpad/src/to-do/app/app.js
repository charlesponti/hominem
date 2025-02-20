(function() {
  'use strict';

  /**
     * @desc The form used to create to-dos
     * @type {HTMLElement}
     */
  const form = document.getElementById('toDoForm');

  /**
     * @desc The unordered list where to-dos will be shown.
     * @type {HTMLElement}
     */
  const ul = document.getElementById('toDoList');

  /**
     * @desc New ToDoList
     * @type {ToDoList}
     */
  const toDoList = new ToDoList(ul, form);

  /**
     * @desc Load tasks from Local Storage
     */
  toDoList.loadLocalStore();
})();

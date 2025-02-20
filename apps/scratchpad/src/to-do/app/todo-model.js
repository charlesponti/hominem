/**
 * @constructor
 * @desc Constructs new To-Do item
 * @param {string} task
 * @param {date} date
 * @param {date} id - ID of To Do item
 */
const ToDo = function(task, date, id) {
  'use strict';

  /**
   * @cfg {string} task
   */
  this.task = task;

  /**
   * @cfg {date} date
   */
  this.date = date;

  /**
   * @cfg {number} id
   */
  this.id = id;

  /**
   * @desc Whether to-do is completed or not
   * @type {boolean}
   */
  this.completed = false;

  this.createCheckBox = function() {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.onclick = this.complete;
    checkbox.onchange = this.complete;
    return checkbox;
  };

  this.createDelete = function() {
    const deleteLabel = document.createElement('button');
    deleteLabel.href = '#';
    deleteLabel.innerHTML = 'Delete!';
    deleteLabel.dataset.todo = this.id;
    return deleteLabel;
  };

  /**
   * @desc Make HTML template for to-do item
   * @return {String} HTML template of task
   */
  this.template = function() {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const checkbox = this.createCheckBox();
    const deleteLabel = this.createDelete();

    label.for = checkbox.id = (this.id || 0);
    label.innerHTML = checkbox.outerHTML + this.task + deleteLabel.outerHTML;
    label.innerHTML = checkbox.outerHTML + this.task;

    checkbox.checked = this.completed;
    li.innerHTML += label.outerHTML;

    return li.outerHTML;
  };
};

window.ToDo = ToDo;

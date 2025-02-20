/**
 * @classdesc Constructs new ToDoList
 * @param {HTMLElement} ul
 * @param {HTMLElement} form
 * @constructor
 */
const ToDoList = function(ul, form) {
  'use strict';

  const _this = this;

  /**
   * @desc Form used to create new to-dos
   * @type {HTMLElement}
   */
  this.form = form;

  /**
   * @desc Unordered list where to-dos will be shown
   * @type {HTMLElement}
   */
  this.list = ul;

  this.todos = [];

  this.form.onsubmit = function(e) {
    e.preventDefault();
    const task = this.task.value;
    const date = this.due_date.value || new Date();
    const numOfTodos = _this.todos.length;
    const todo = new ToDo(task, date, numOfTodos + 1);
    _this.addToLocalStore(todo);
    _this.addTodo(todo);
  };

  this.addEvents = function() {
    const inputs = document.getElementsByTagName('input');
    const labels = document.getElementsByTagName('a');
    const inputsArray = Array.prototype.slice.call(inputs);
    const labelsArray = Array.prototype.slice.call(labels); // eslint-disable-line

    inputsArray.forEach(function(input) {
      if (input.type === 'checkbox') {
        input.onclick = _this.completeTodo;
      }
    });
  };

  this.loadLocalStore = function() {
    if (localStorage.tasks) {
      JSON.parse(localStorage.tasks).forEach(function(todo) {
        todo = new ToDo(todo.task, todo.date || new Date(), todo.id);
        _this.addTodo(todo);
      });
    }
  };

  this.addToLocalStore = function(todo) {
    if (todo.id && todo.task) {
      let tasks;
      if (localStorage.tasks) {
        tasks = JSON.parse(localStorage.tasks);
        tasks.push(todo);
      } else {
        tasks = [todo];
      }
      tasks = JSON.stringify(tasks);
      localStorage.setItem('tasks', tasks);
    }
  };

  /**
   * @param {string} todo
   * @desc Add to-do item to list of to-dos
   */
  this.addTodo = function(todo) {
    if (todo.task.length > 1) {
      _this.todos.push(todo);
      if (todo.template) {
        _this.list.innerHTML += todo.template();
      } else {
        const newToDo = _this.loadLocalTodo(todo);
        _this.list.innerHTML += newToDo.template();
      }
      this.addEvents();
    }
  };

  this.removeTodo = function(e) {
    if (e.target.dataset.todo) {

    }
  };

  /**
   * @desc Change class of label to finished
   * @param {object} e - DOM Event
   */
  this.completeTodo = function(e) {
    if (e.target.checked) {
      e.target.parentElement.classList.add('finished');
    } else {
      e.target.parentElement.classList.remove('finished');
    }
  };
};

window.ToDoList = ToDoList;

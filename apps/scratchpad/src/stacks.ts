/**
 * # Stacks
 * Stacks are list data structure which follow the FILO (First In, Last Out) principle.
 * When as items are placed onto the stack, those placed first will be the last to be removed.
 * The last item placed on the stack must be removed before others can.
 *
 * ## Examples
 *
 * ### Stack of Books
 * A great visual representation is a stack of books. When you a place a book on top of
 * a stack of books, that book must be removed before the other books can be removed.
 *
 * ### Browser back button
 * Another example of a stack is your browser's back button. When you visit a web page, the url
 * of that page is placed into the stack of pages previously visited. When you click the back
 * button, you are "popping" the last
 */

class Stack {
    count = 0;

    items = {}

    constructor(items?: any[]) {
      if (items) items.forEach(item => this.push(item))
    }

    /**
     * @description Add item to the Stack
     * @param {*} item
     */
    push(item: any) {
      this.items[this.count] = item;
      this.count += 1;
    }

    /**
     * @description Remove and return the last element in the Stack
     * @returns {*}
     */
    pop(): any {
      // Retrieve last item added to stack
      const item = this.items[this.count - 1];
      
      // Remove item
      delete this.items[this.count - 1];

      // Decrease count now that item has been removed
      this.count -= 1

      // Return item
      return item;
    }

    /**
     * @description Retrieve the first element in the Stack
     * @returns {*}
     */
    peek(index?: number): any {
      return this.items[index || 0];
    }

    /**
     * @description Return the number of items in the Stack
     * @returns {*}
     */
    length(): any {
      return this.count;
    }
}

/**
 * @description Check if word is a palindrome
 * @param {string} word - Word to check
 */
export function isPalindrome(word: string) {
  let test = '';
  const letters = new Stack(word.split(''));

  for (let i = 0; i < word.length; i++) {
    let letter = letters.pop()
    test += letter;
  }

  return test === word;
}

export default Stack;

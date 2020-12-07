/**
 * An output stream.
 */
interface Output {
  /**
   * Display the text.
   * @param text the text to be displayed
   */
  display(text: string): void;
}

/**
 * The console.
 */
export class Console implements Output {
  display(text: string): void {
    console.log(text);
  }
}

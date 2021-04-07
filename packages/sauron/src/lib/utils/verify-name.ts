/**
 * Verify is string is a valid name
 * @param name
 * @returns if true is valid, false is invalid
 */
export function verifyName(name: string): boolean {
  return name.match(/^[a-zA-Z_$][a-zA-Z_$0-9]*$/) !== null;
}

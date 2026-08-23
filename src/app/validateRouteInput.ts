export function isValidRouteInput(text: string): boolean {
  return text.length >= 10 && text.length <= 300;
}

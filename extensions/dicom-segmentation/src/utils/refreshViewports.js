export default function refreshViewports() {
  cornerstone.getEnabledElements().forEach(enabledElement => {
    // console.log(enabledElement)
    cornerstone.updateImage(enabledElement.element);
  });
}

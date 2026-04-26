export function initSwipe(element, onSwipeLeft, onSwipeRight) {
    let touchStartX = 0, touchEndX = 0;
    element.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; });
    element.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 50) diff > 0 ? onSwipeRight() : onSwipeLeft();
    });
}

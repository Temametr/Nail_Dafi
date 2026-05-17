export function renderListSkeleton(count = 4) {
    return Array.from({ length: count }).map((_, index) => `
        <div class="ui-card ui-row ui-appear" style="animation-delay: ${index * 35}ms">
            <div class="ui-skeleton-avatar"></div>

            <div style="flex: 1; min-width: 0;">
                <div class="ui-skeleton-line" style="width: 68%; margin-bottom: 8px;"></div>
                <div class="ui-skeleton-line" style="width: 46%;"></div>
            </div>

            <div class="ui-skeleton" style="width: 42px; height: 42px; border-radius: 1.15rem;"></div>
        </div>
    `).join('');
}

export function renderCompactListSkeleton(count = 5) {
    return Array.from({ length: count }).map((_, index) => `
        <div class="ui-card-sm ui-row ui-appear" style="animation-delay: ${index * 30}ms">
            <div class="ui-skeleton-avatar"></div>

            <div style="flex: 1; min-width: 0;">
                <div class="ui-skeleton-line" style="width: 60%; margin-bottom: 7px;"></div>
                <div class="ui-skeleton-line" style="width: 38%;"></div>
            </div>
        </div>
    `).join('');
}

export function renderGridSkeleton(count = 4) {
    return Array.from({ length: count }).map((_, index) => `
        <div class="ui-skeleton ui-appear" style="aspect-ratio: 3 / 4; animation-delay: ${index * 35}ms;"></div>
    `).join('');
}

export function renderCardSkeleton(count = 2) {
    return Array.from({ length: count }).map((_, index) => `
        <div class="ui-skeleton ui-appear" style="height: 140px; animation-delay: ${index * 45}ms;"></div>
    `).join('');
}
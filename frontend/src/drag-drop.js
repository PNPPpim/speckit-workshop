// Drag and Drop Module
export function setupDragDrop(onReorder) {
  const albumItems = document.querySelectorAll('.album-item')
  let draggedElement = null
  let draggedIndex = null

  albumItems.forEach((item) => {
    item.addEventListener('dragstart', (e) => {
      draggedElement = item
      draggedIndex = parseInt(item.dataset.index)
      item.classList.add('dragging')
      e.dataTransfer.effectAllowed = 'move'
    })

    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging')
      albumItems.forEach((el) => el.classList.remove('drag-over'))
    })

    item.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      if (item !== draggedElement) {
        item.classList.add('drag-over')
      }
    })

    item.addEventListener('dragleave', (e) => {
      item.classList.remove('drag-over')
    })

    item.addEventListener('drop', (e) => {
      e.preventDefault()

      if (item !== draggedElement) {
        const targetIndex = parseInt(item.dataset.index)
        onReorder(draggedIndex, targetIndex)
      }

      item.classList.remove('drag-over')
    })
  })
}

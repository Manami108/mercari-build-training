import { useEffect, useState } from 'react';
import { Item, fetchItems } from '~/api';

interface Prop {
  reload: boolean;
  searchQuery: string;
  sortOrder: 'latest' | 'oldest';
  onLoadCompleted: () => void;
}

export const ItemList = ({ reload, searchQuery, sortOrder, onLoadCompleted }: Prop) => {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    const fetchData = () => {
      fetchItems()
        .then((data) => {
          console.debug('GET success:', data);
          let sortedItems = data.items || [];

          // ✅ Sort by latest or oldest
          sortedItems.sort((a: Item, b: Item) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
          });

          setItems(sortedItems);
          onLoadCompleted();
        })
        .catch((error) => {
          console.error('GET error:', error);
        });
    };

    if (reload || sortOrder) {
      fetchData();
    }
  }, [reload, onLoadCompleted, sortOrder]);

  // 🔍 Filter items based on search query
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="ItemListContainer">
      {filteredItems.map((item) => (
        <div
          key={item.id}
          className="ItemList"
          onClick={() => setSelectedItem(item)}
        >
          <img src={item.image_url || "/logo192.png"} alt={item.name || "Item"} />
          <p><span>{item.name || "Unknown"}</span></p>
        </div>
      ))}

      {/* 🔥 Show Modal if an item is clicked */}
      {selectedItem && (
        <div className="ModalBackground" onClick={() => setSelectedItem(null)}>
          <div className="ModalContent" onClick={(e) => e.stopPropagation()}>
            <img src={selectedItem.image_url || "/logo192.png"} alt={selectedItem.name} className="ModalImage" />
            <h2>{selectedItem.name}</h2>
            <p><b>Category:</b> {selectedItem.category}</p>
            <p><b>Added On:</b> {new Date(selectedItem.timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
            <button onClick={() => setSelectedItem(null)}>Close</button>
          </div>
        </div>
      )}
    </div>

    
  );
};

import { useState, useEffect } from 'react';
import './App.css';
import { ItemList } from '~/components/ItemList';
import { Listing } from '~/components/Listing';

function App() {
  const [view, setView] = useState<'home' | 'add' | 'list'>('home');
  const [reload, setReload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [showSortOptions, setShowSortOptions] = useState(false);

  const handleViewChange = (newView: 'home' | 'add' | 'list') => {
    setView(newView);
    if (newView === 'list') {
      setReload(true);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.querySelector('.DropdownContainer');
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setShowSortOptions(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="App">
      <header className="Title">
        <p><b>Mini Mercari</b></p>
      </header>

      {/* Navigation Buttons */}
      <div className="NavButtons">
        <button onClick={() => handleViewChange('home')}>Home</button>
        <button onClick={() => handleViewChange('add')}>Add Item</button>

        {/* View Items Button with Dropdown */}
        <div className="DropdownContainer">
          <button onClick={() => {
            handleViewChange('list');
            setShowSortOptions((prev) => !prev); // Toggle dropdown
          }}>
            View Items ⏷
          </button>

          {showSortOptions && (
            <div className="DropdownMenu">
              <button onClick={() => {
                setSortOrder('latest');
                setShowSortOptions(false);
              }}>
                Sort by Latest
              </button>
              <button onClick={() => {
                setSortOrder('oldest');
                setShowSortOptions(false);
              }}>
                Sort by Oldest
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="SearchBar"
        />
      </div>

      <div className="Content">
        {view === 'home' && (
          <div className="HomeContent">
            <h2>Welcome to Mini Mercari 😃</h2>
            <p>Every item has a new home waiting!</p>
          </div>
        )}
          
        {view === 'add' && <Listing onListingCompleted={() => setReload(true)} />}
        {view === 'list' && (
          <ItemList
            reload={reload}
            searchQuery={searchQuery}
            sortOrder={sortOrder}
            onLoadCompleted={() => setReload(false)}
          />
        )}
      </div>
    </div>
  );
}

export default App;

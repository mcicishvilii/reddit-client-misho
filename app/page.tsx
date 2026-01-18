<div id="app">
  <input type="text" id="searchInput" placeholder="Search for a book...">
  <button onclick="searchBooks()">Search</button>
  <table id="resultsTable">
    <thead>
      <tr>
        <th>Title</th>
        <th>Biblusi Price</th>
        <th>Parnasi Price</th>
      </tr>
    </thead>
    <tbody id="resultsBody"></tbody>
  </table>
</div>

<script>
async function searchBooks() {
  const query = document.getElementById('searchInput').value;
  const response = await fetch(`http://bookcompare.ladogudi.serv00.net/search?q=${query}`);
  const data = await response.json();
  
  const body = document.getElementById('resultsBody');
  body.innerHTML = ''; // Clear old results

  data.items.forEach(book => {
    // Note: You'll need an endpoint that returns compared prices 
    // or adjust your /search result to include biblusi_price and parnasi_price
    body.innerHTML += `
      <tr>
        <td>${book.title}</td>
        <td>${book.biblusi_price || 'N/A'} GEL</td>
        <td>${book.parnasi_price || 'N/A'} GEL</td>
      </tr>`;
  });
}
</script>

const token = "nfp_GJDmLKMSZUnrLbW7TLff5Pn99KHZPpX4b333";
fetch("https://api.netlify.com/api/v1/sites?name=planeacionseit", {
  headers: { Authorization: `Bearer ${token}` }
})
.then(r => r.json())
.then(d => {
  if (d && d.length > 0) {
    console.log("Found site:", d[0].site_id);
    console.log("Site URL:", d[0].url);
  } else {
    // If not found by name exact match, just get all sites and check
    return fetch("https://api.netlify.com/api/v1/sites", {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(all => {
      const match = all.find(s => s.name.includes("planeacionseit"));
      if (match) {
        console.log("Found site from all:", match.site_id);
      } else {
        console.log("Not found among", all.length, "sites");
      }
    });
  }
})
.catch(console.error);

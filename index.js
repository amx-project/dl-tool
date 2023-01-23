import fetch from "node-fetch";

async function fetchMOJList() {
  const url = "https://www.geospatial.jp/ckan/api/3/action/organization_list";
  const resp = await fetch(url);
  const json = await resp.json();
  const out = json.result.filter(x => x.match(/^moj-\d{2}/));
  out.sort();
  return out;
}

async function fetchOrgDatasetList(orgId) {
  const url = `https://www.geospatial.jp/ckan/api/3/action/package_search?q=organization:${orgId}&rows=500`;
  const resp = await fetch(url);
  const json = await resp.json();
  const out = json.result.results.map(x => ({
    id: x.id,
    name: x.name,
    title: x.title,
    zip_name: x.resources.find(x => x.format.toLowerCase() === 'zip').name,
    zip_url: x.resources.find(x => x.format.toLowerCase() === 'zip').url,
  }));
  return out;
}

(async () => {
  const orgs = await fetchMOJList();
  console.log("Downloading from orgs: ", orgs);
  for (const org of orgs) {
    const datasets = await fetchOrgDatasetList(org);
    console.log(`Datasets in ${org}: `, datasets);
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});

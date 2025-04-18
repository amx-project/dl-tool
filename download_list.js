import { writeFile } from 'node:fs/promises';

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
  const out = json.result.results.flatMap(x => {
    return x.resources.filter(x => x.format.toLowerCase() === 'zip').map(y => ({
      id: x.id,
      name: x.name,
      title: x.title,
      year: y.name.match(/(\d{4})\.zip$/)[1],
      zip_name: y.name,
      zip_url: y.url,
    }));
  });

  return out;
}

(async () => {
  const orgs = await fetchMOJList();
  // console.log("Downloading from orgs: ", orgs);
  // console.log(`"CKAN組織","自治体","year","name","url"`);
  const out = [];
  for (const org of orgs) {
    const datasets = await fetchOrgDatasetList(org);
    // console.log(`Datasets in ${org}: `, datasets);

    for (const ds of datasets) {
      out.push({
        org,
        title: ds.title,
        year: ds.year,
        zip_name: ds.zip_name,
        zip_url: ds.zip_url,
      });
    }
  }

  out.sort((a, b) => {
    if (a.org < b.org) return -1;
    if (a.org > b.org) return 1;
    if (a.year < b.year) return -1;
    if (a.year > b.year) return 1;
    return 0;
  });

  await writeFile('out_list.json', JSON.stringify(out, null, 2));
})().catch(e => {
  console.error(e);
  process.exit(1);
});

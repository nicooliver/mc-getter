'use strict';

const fetch = require('node-fetch');

const productsUrl = 'https://www.mcdonalds.at/unsere-produkte';
const rProducts = /href="(?<url>https:\/\/www.mcdonalds.at\/produkt\/[a-zA-Z0-9-]+)"/g;
const rContent = /<b>Portion<\/b>(?<content>.+?)<b>per 100g<\/b>/;
const rKcal = /<b>(?<kcal>\d*\.*?\d)kcal/;
const rProtein = /Eiweiß<\/b><\/p><p><b>(?<protein>\d*\.*?\d)g/;
const excludes = [
    'tee',
    'sprite',
    'saft',
    'tea',
    'cola',
    'fanta',
    'espresso',
    'voeslauer',
    'cafe',
    'drink',
    'caffe',
    'cappuccino',
];

const main = async() => {
    const urls = await getProductUrls();
    const products = await getProducts(urls);

    console.table(products);
}

const getProducts = async(urls) => {
    let products = [];

    for (const u of urls) {
        let p = await getProductByUrl(u);
        if (!p.mn || p.mn === -1 || p.protein <= 0) continue;
        if (products.find(x => x.name === p.name)) continue;

        console.log('Adding: ', p.name);
        products.push(p);
    }

    products.sort((a, b) => a.mn - b.mn);
    return products;
}

const getProductByUrl = async(url) => {
    const name = url.split('/').pop();

    const isBad = excludes.some(x => name.includes(x));
    if (isBad) return createEmptyProduct();

    try {
        let html = await getHtmlByUrl(url);
        html = html.replace(/[\n\t]/g, '');

        const content = rContent.exec(html).groups.content;

        const kcal = +rKcal.exec(content).groups.kcal;
        const protein = +rProtein.exec(content).groups.protein;
        const mn = Math.round((kcal / protein) * 100) / 100;

        return createProduct(name, kcal, protein, mn);
    } catch (ex) {
        console.error('Error at: ', url);
        return createEmptyProduct();
    }
}

const createEmptyProduct = () => createProduct(null, null, null, null);

const createProduct = (name, kcal, protein, mn) => {
    return {
        name: name,
        kcal: kcal,
        protein: protein,
        mn: mn,
    };
}

const getProductUrls = async() => {
    const html = await getHtmlByUrl(productsUrl);
    const urls = [];

    let match = rProducts.exec(html);
    do {
        urls.push(match.groups.url);
    } while ((match = rProducts.exec(html)) !== null);

    console.log(`Found ${urls.length} products`);
    return urls;
}

const getHtmlByUrl = async(url) => {
    const response = await fetch(url);
    return await response.text();
}

main();
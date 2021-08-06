const needle = require('needle');
const convert = require('color-convert');
const config = require('config');
Feature('css_check');

const getAllocations = async () => {
    const uid = config.get('UID');
    const response = await needle('get', `${config.get('PARTICIPANT_URL')}v1/${config.get('ENVIRONMENT_ID')}/${uid}/allocations`).then((res)=>{
        if (res.statusCode == 200){
            res.body.forEach(element => {
                for (const property in element.genome.web) {
                    console.log(`${property}: ${element.genome.web[property]}`);
                  }
                
            });
           return res;
        }else {
            throw new Error('Something is wrong: '+res);
        }
            
    })
    
    return response;
}

const getAssetsJSContent = async () => {
    const response = await needle('get', `${config.get('PARTICIPANT_URL')}v1/${config.get('ENVIRONMENT_ID')}/${config.get('UID')}/assets.js`).then((res)=>{
        if (res.statusCode == 200){
           return res.body;
        }else {
            throw new Error('Something is wrong: '+res);
        } 
            
    })
    
    return response;
}

const getLocator = async (string) => {
    const response = await needle('get', string).then((res)=>{
        if (res.statusCode == 200){
           return res.body;
        }else {
            throw new Error('Something is wrong: '+res);
        }
            
    });
    console.log("css from file: " + response);
    let locator;
    try {
        locator = response.split('{')[0].trim().split(' ')[1]; 
    } catch (error) {
        throw new Error(error);
    }
    
    return locator;
}

const getAttribute = async (string) => {
    const response = await needle('get', string).then((res)=>{
        if (res.statusCode == 200){
           return res.body;
        }else {
            throw new Error('Something is wrong: '+res);
        }    
    });
    if(response){
        const attr = response.split(' ')[1].split('{')[1].split(":")[0]; 
        const value = response.split(' ')[1].split('{')[1].split(":")[1].slice(0, -1); 
        const res = { attr:attr, value:value };
        console.log(res);
        return res;
    }else {
        throw new Error('No changes to be checked with.');
    }
}

Scenario('check for css values', async ({ I }) => {
    I.amOnPage('/');
    //get evolv scripts and use 
    const scripts = await I.grabAttributeFromAll(locate('//head').find('script'),'src');
    
   
    let allocations;
    await scripts.forEach(element => {
        if(element)
        if(element.includes('evolv')){
            console.log('Evolv script loaded: '+ element);
            allocations = getAllocations(element);
        }
    });
    
    const links = await I.grabAttributeFromAll(locate('//head').find('link'),'href');
    
    
    let cssAsset = null;
    
    await links.forEach(element => {
        if(element)
        if(element.includes('evolv')){
            console.log('Evolv css asset loaded: '+ element);
            cssAsset = element;
        }
    });
    //get locators via request to css asset directly
    if(!cssAsset){
    
        throw new Error('links does not contain evolv assets');
        
    }

    const locator = await getLocator(cssAsset);
    const css = await getAttribute(cssAsset);
    //wait for this locator to load on page
    I.waitForElement(locator);
    const cssAttr = await I.grabCssPropertyFrom(locator, css.attr);
    //check if css from assets corresponds to what we see on page
    I.assertContain(cssAttr, convert.keyword.rgb(css.value).join(', ').toString());
    
    let activeKeys = await I.executeScript(async () => {
        let keys = await evolv.client.getActiveKeys();
        let formatedKeys = [];
        keys.current.forEach(element => {
            formatedKeys.push('evolv_'+element.replaceAll('.','_'));
        });
        return formatedKeys;
    })
    
    if(activeKeys.includes(config.get('ACTIVE_KEY'))){
        console.log('Key is present');
    }else{
        throw new Error('Active key in not present.');
    }

    
  
});

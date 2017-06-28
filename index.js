#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const find = require("find");
const templateBase = path.dirname(process.argv[1]);
const executableName = path.basename(templateBase);

const titleize = function(subject){
  return subject.trim().replace(/[-_]/g, " ").replace(/(^|\s)(\w)/g, match => match.trim().toUpperCase());
};

const compileTemplate = function(target, pattern, configuration){
  return target.replace(pattern, (_u, key) => configuration[key] || "");
};

const showSuccess = function(message){
  console.error(`\x1b[32m${executableName} info\x1b[0m: ${message}`);
};

const showWarning = function(message){
  console.error(`\x1b[33m${executableName}  warn\x1b[0m: ${message}`);
};

const showError = function(message){
  console.error(`\x1b[31m${executableName} error\x1b[0m: ${message}`);
};

const loadConfiguration = function(base, root, template, configurationFile){
  const configuration = {
    root,
    base,
    template,
    name: path.basename(base),
    namespace: titleize(base),
    env: base.toUpperCase().replace("-", "_"),
    year: new Date().getFullYear(),
    author: "Shogun",
    authorEmail: "shogun@cowtech.it",
    githubUser: "ShogunPanda",
    summary: null,
    description: null,
    templateExtension: ".ctt"
  };

  if(configurationFile){
    try{
      Object.assign(configuration, require(path.resolve(process.cwd(), configurationFile)));
    }catch(e){
      if(!e.message.match(/^Cannot find module/))
        throw e;

     showWarning(`Cannot load file \x1b[1m${configurationFile}\x1b[22m. Will continue with default configuration.`);
    }
  }

  // Backfill some keys
  if(!configuration.description)
    configuration.description = configuration.summary;

  if(!configuration.repository)
    configuration.repository = `${configuration.githubUser}/${configuration.name}`;

  if(!configuration.url)
    configuration.url = `https://github.com/${configuration.githubUser}/${configuration.name}`;

  if(!configuration.docsUrl)
    configuration.docsUrl = `https://${configuration.githubUser.toLowerCase()}.github.io/${configuration.name}`;

  // Set expression for template compilation
  configuration.fileNameRegex = new RegExp(`(?:_ctt@(${Object.keys(configuration).join("|")}))`, "gm");
  configuration.fileContentsRegex = new RegExp(`(?:\\{\\{(${Object.keys(configuration).join("|")})\\}\\})`, "gm");

  return configuration;
};

const compileFile = async function(configuration, file, current, total, padding){
  const fullPath = compileTemplate(
    file
      .replace(configuration.template, configuration.root)
      .replace(new RegExp(`(?:${configuration.templateExtension})$`), ""),
    configuration.fileNameRegex, configuration
  );

  const relativePath = fullPath.replace(configuration.root, configuration.base);
  const compile = file.endsWith(configuration.templateExtension);
  let content = await fs.readFile(file, "utf-8");

  if(compile)
    content = compileTemplate(content, configuration.fileContentsRegex, configuration);

  await fs.mkdirp(path.dirname(fullPath));
  await fs.writeFile(fullPath, content, "utf-8");

  showSuccess(`[${current.toString().padStart(padding, "0")}/${total}] Created file \x1b[1m\x1b[34m${relativePath}\x1b[0m\x1b[22m.`);
};

const execute = async function(){
  try{
    // Load the configuration
    const base = process.argv[2];
    const template = path.resolve(templateBase, "template");
    const root = path.resolve(process.cwd(), base);
    const configuration = loadConfiguration(base, root, template, process.argv[3]);

    // Copy and compile files
    const files = find.fileSync(template);
    const total = files.length;
    const padding = total.toString().length;

    for(let current = 0; current < total; current++)
      await compileFile(configuration, files[current], current, total, padding);
  }catch(e){
    showError(e);
  }
}

module.exports = execute;

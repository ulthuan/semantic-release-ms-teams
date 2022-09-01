const nodeFetch = require('node-fetch-commonjs').default
const teamsify = require('./teamsify')
const getUrl = require('./getUrl')
const HttpsProxyAgent = require('https-proxy-agent');

module.exports = async (pluginConfig, context) => {
  const { logger, env, options } = context
  const notifyInDryRun = pluginConfig.notifyInDryRun ?? true
  const url = getUrl(pluginConfig, context)
  const headers = { 'Content-Type': 'application/json' }
  let body
  let teamsifyError = false

  try {
    body = JSON.stringify(await teamsify(pluginConfig, context, options.dryRun && notifyInDryRun))
  } catch (e) {
    const message = 'An error occurred while parsing the release notes.'
    logger.error(message)
    logger.error(e)
    teamsifyError = true
  }

  if (!teamsifyError) {
    const options = {
      method: 'post',
      body,
      headers
    }
    if (process.env.HTTPS_PROXY){
      const https_proxy = process.env.HTTPS_PROXY
      logger.info(`Found proxy: ${https_proxy}`)
      options['agent']=new HttpsProxyAgent(https_proxy)
    }else{
      logger.info('Not found proxy, use direct connection')
    }
    await nodeFetch(url, options)
      .then(() => logger.log('Message sent to Microsoft Teams'))
      .catch((error) => logger.error('An error occurred while sending the message to Teams', error))
      .finally(() => {
        env.HAS_PREVIOUS_EXECUTION = true
      })
  }
}

module.exports = async function handler(_request, response) {
  response.setHeader("Cache-Control", "no-store");
  return response.status(410).json({
    error: "The demo-request form has been retired. Contact Lunarion at lunarion31@whale.lat.",
  });
};

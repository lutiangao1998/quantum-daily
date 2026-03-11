import { callDataApi } from "./server/_core/dataApi.ts";

async function debugStock() {
  try {
    const result = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: "IONQ",
        region: "US",
        interval: "1d",
        range: "5d",
        includeAdjustedClose: "true",
      },
    });

    const apiResult = result;
    console.log("Full API Response:");
    console.log(JSON.stringify(apiResult, null, 2));

    if (apiResult?.chart?.result?.[0]) {
      const chartData = apiResult.chart.result[0];
      const meta = chartData.meta;
      
      console.log("\n=== Meta Data ===");
      console.log("Current Price:", meta.regularMarketPrice);
      console.log("Previous Close:", meta.previousClose);
      console.log("Day High:", meta.regularMarketDayHigh);
      console.log("Day Low:", meta.regularMarketDayLow);
      
      console.log("\n=== Calculated Change ===");
      const change = (meta.regularMarketPrice || 0) - (meta.previousClose || 0);
      const changePercent = ((meta.regularMarketPrice || 0) - (meta.previousClose || 0)) / (meta.previousClose || 1);
      console.log("Change:", change);
      console.log("Change %:", changePercent * 100);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

debugStock();

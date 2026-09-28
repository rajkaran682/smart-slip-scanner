const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());

app.use(express.json({
  limit: "15mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "15mb"
}));


/* =========================================
   FRONTEND
========================================= */

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


/* =========================================
   HEALTH CHECK
========================================= */

app.get("/api/health", (req, res) => {

  res.json({

    success: true,

    message:
      "Smart Slip Scanner API is running",

    version: "1.1.0",

    handwritingAI:
      process.env.HANDWRITING_AI_URL
        ? "configured"
        : "not-configured"

  });

});


/* =========================================
   OCR ENGINE STATUS
========================================= */

app.get("/api/ocr/status", (req, res) => {

  res.json({

    success: true,

    engines: {

      localTesseract: true,

      handwritingAI:
        Boolean(
          process.env.HANDWRITING_AI_URL
        )

    },

    message:
      "OCR engine status available"

  });

});


/* =========================================
   HANDWRITING AI ENDPOINT
========================================= */

app.post("/api/ocr/handwriting", async (req, res) => {

  try {

    const {
      image,
      language = "auto"
    } = req.body;


    if (!image) {

      return res.status(400).json({

        success: false,

        message:
          "Image data is required"

      });

    }


    /*
     * अभी external AI service
     * connect नहीं की गई है।
     *
     * इसलिए साफ response देंगे।
     */

    if (
      !process.env.HANDWRITING_AI_URL
    ) {

      return res.status(503).json({

        success: false,

        engine:
          "handwriting-ai",

        configured: false,

        message:
          "Dedicated handwriting AI is not configured yet.",

        fallback:
          true

      });

    }


    /*
     * अगला चरण:
     *
     * image → dedicated handwriting AI
     *
     * यहाँ external service को call किया जाएगा।
     *
     * API key कभी frontend में नहीं जाएगी।
     */


    const response =
      await fetch(
        process.env.HANDWRITING_AI_URL,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            ...(process.env.HANDWRITING_AI_KEY
              ? {
                  "Authorization":
                    `Bearer ${process.env.HANDWRITING_AI_KEY}`
                }
              : {})

          },

          body: JSON.stringify({

            image,

            language

          })

        }
      );


    if (!response.ok) {

      const errorText =
        await response.text();


      return res.status(502).json({

        success: false,

        message:
          "Handwriting AI service returned an error.",

        details:
          errorText.slice(0, 500),

        fallback:
          true

      });

    }


    const data =
      await response.json();


    return res.json({

      success: true,

      engine:
        "handwriting-ai",

      data

    });


  } catch (error) {

    console.error(
      "Handwriting AI error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Handwriting AI request failed.",

      fallback:
        true

    });

  }

});


/* =========================================
   MAIN WEBSITE
========================================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );

});


/* =========================================
   404 API
========================================= */

app.use("/api", (req, res) => {

  res.status(404).json({

    success: false,

    message:
      "API endpoint not found"

  });

});


/* =========================================
   SERVER
========================================= */

const PORT =
  process.env.PORT || 10000;


app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Smart Slip Scanner running on port ${PORT}`
    );

  }
);

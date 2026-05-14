"use client";
import Image from "next/image";
import landscape from "../../public/345152.jpg";
import portrait from "../../public/39556acfa297280603c120cb0cf8bdae.jpg";

import { useState } from "react";

const CrawlPage = () => {
  const [url, setUrl] = useState("");
  const [displayMode, setDisplayMode] = useState("landscape");

  const startCrawler = async (e) => {
    e.preventDefault();

    console.log("URL:", url);
    console.log("Display:", displayMode);

    // send to api
    const res = await fetch("/api/crawl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        displayMode,
      }),
    });
  };

  return (
    <div className="w-full h-full p-10 m-4 fle">
      <h1 className="text-3xl font-bold my-4 text-center">Crawl Page</h1>

      <form onSubmit={startCrawler} className="m-4">
        <div>
          <input
            type="text"
            placeholder="Type a url"
            className=" outline-2 outline-offset-2 outline-solid border-2 border-gray-300 rounded-md p-2 w-full"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <h3 className="mt-4">Choose game type:</h3>

        <div className="flex flex-col justify-between gap-10 p-2">
          <div className="flex flex  w-[100%] justify-space">
            <div className="flex flex-col w-[50%] justify-center items-center">
              <Image src={landscape} alt="Landscape" />
            </div>

            <div className="flex flex-col w-[50%] justify-center items-center">
              <Image loading="eager" src={portrait} alt="Portrait" />
            </div>
          </div>

          <div className="flex flex  w-[100%] justify-space">
            <div className="flex flex-col w-[50%] justify-center items-center">
              <input
                type="radio"
                id="landscape"
                name="displayMode"
                value="landscape"
                checked={displayMode === "landscape"}
                onChange={(e) => setDisplayMode(e.target.value)}
              />

              <label htmlFor="landscape">Landscape</label>
            </div>
            <div className="flex flex-col w-[50%] justify-center items-center">
              <input
                type="radio"
                id="portrait"
                name="displayMode"
                value="portrait"
                checked={displayMode === "portrait"}
                onChange={(e) => setDisplayMode(e.target.value)}
              />

              <label htmlFor="portrait">Portrait</label>
            </div>
          </div>

        </div>

        <div className="w-full flex justify-center m-4">
          <button type="submit" className="btn btn-outline">
            Start Crawl
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrawlPage;

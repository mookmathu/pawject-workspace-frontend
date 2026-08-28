import React, { useState } from "react";
import GlobalStyles from "../../components/common/GlobalStyles";
import AssetPlaceholder from "../../components/mockups/AssetPlaceholder";
import styles from "./styles";

const NAV_ITEMS = ["Dashboard", "Task", "Chat", "Calendar"];

/**
 * WelcomePage
 * "Welcome Aboard!" home screen, based on the Figma reference.
 * Full-bleed, frameless long page — no boxed/rounded card, the sky/ocean
 * gradient runs edge to edge behind the header, nav, and hero.
 *
 * The sailboat, birds, mascot icon, and wooden signpost are all dashed
 * <AssetPlaceholder /> slots reserved at roughly the right size/position
 * so the final artwork + animations can be dropped straight in later
 * without touching the layout.
 */
export default function WelcomePage() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  return (
    <div style={styles.page}>
      <GlobalStyles />

      {/* HEADER: mascot + title */}
      <div style={styles.header}>
        <div style={styles.mascotWrap} title="ใส่ไอคอน mascot ตรงนี้ทีหลัง">
          🙂
        </div>
        <h1 style={styles.title}>Welcome Aboard!</h1>
      </div>

      {/* SEGMENTED NAV */}
      <div style={styles.navWrap}>
        <nav style={styles.navBar}>
          {NAV_ITEMS.map((item) => {
            const isActive = item === activeTab;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setActiveTab(item)}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                {item}
              </button>
            );
          })}
        </nav>
      </div>

      {/* HERO: long sky + ocean scene */}
      <div style={styles.hero}>
        {/* bird placeholders — swap for a flock illustration / lottie animation later */}
        <AssetPlaceholder
          label="นก"
          width={110}
          height={60}
          style={{ position: "absolute", top: "6%", left: "5%" }}
        />
        <AssetPlaceholder
          label="นก"
          width={90}
          height={50}
          style={{ position: "absolute", top: "3%", right: "22%" }}
        />
        <AssetPlaceholder
          label="นก"
          width={80}
          height={46}
          style={{ position: "absolute", top: "16%", left: "38%" }}
        />

        {/* wooden signpost placeholder */}
        <AssetPlaceholder
          label="ป้ายบอกทาง"
          hint="เช่น Bells Beach, Trestles"
          width={110}
          height={260}
          style={{ position: "absolute", right: "4%", bottom: "4%" }}
        />

        {/* sailboat placeholder — swap for the boat illustration / animation later */}
        <AssetPlaceholder
          label="เรือใบ"
          hint="แนะนำสัดส่วน 4:3"
          width={240}
          height={170}
          style={{
            position: "absolute",
            left: "50%",
            bottom: "10%",
            transform: "translateX(-50%)",
          }}
        />

        {/* subtle wave crest between sky and water */}
        <svg
          style={styles.oceanWaveSvg}
          viewBox="0 0 430 30"
          preserveAspectRatio="none"
        >
          <path
            d="M0 18 Q35 4 72 18 T144 18 T216 18 T288 18 T360 18 T430 18"
            stroke="#FFFDF8"
            strokeWidth="2"
            strokeOpacity="0.35"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
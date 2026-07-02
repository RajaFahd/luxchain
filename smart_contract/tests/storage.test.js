/* eslint-disable no-undef */
// Right click on the script name and hit "Run" to execute
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Storage", function () {
  it("test initial value", async function () {
    const Storage = await ethers.getContractFactory("Storage");
    const storage = await Storage.deploy();
    await storage.waitForDeployment();
    console.log("storage deployed at:" + storage.target);
    expect(Number(await storage.retrieve())).to.equal(0);
  });
  it("test updating and retrieving updated value", async function () {
    const Storage = await ethers.getContractFactory("Storage");
    const storage = await Storage.deploy();
    await storage.waitForDeployment();
    const storage2 = await ethers.getContractAt("Storage", storage.target);
    const setValue = await storage2.store(56);
    await setValue.wait();
    expect(Number(await storage2.retrieve())).to.equal(56);
  });
});

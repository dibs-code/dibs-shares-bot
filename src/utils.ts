import {Web3} from "web3";

export function fromDecimals(number: bigint, numberOfZerosInDenomination: number) {
  const value = String(Web3.utils.toNumber(number));

  if (numberOfZerosInDenomination <= 0) {
    return value.toString();
  }

  // pad the value with required zeros
  // 13456789 -> 13456789, 1234 -> 001234
  const zeroPaddedValue = value.padStart(numberOfZerosInDenomination, '0');

  // get the integer part of value by counting number of zeros from start
  // 13456789 -> '13'
  // 001234 -> ''
  const integer = zeroPaddedValue.slice(0, -numberOfZerosInDenomination);

  // get the fraction part of value by counting number of zeros backward
  // 13456789 -> '456789'
  // 001234 -> '001234'
  const fraction = zeroPaddedValue.slice(-numberOfZerosInDenomination).replace(/\.?0+$/, '');

  if (integer === '') {
    return `0.${fraction}`;
  }

  if (fraction === '') {
    return integer;
  }

  return `${integer}.${fraction}`;

}

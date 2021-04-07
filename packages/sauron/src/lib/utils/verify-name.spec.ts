import { verifyName } from './verify-name';

describe('verify name', () => {
  it('should verify name', () => {
    expect(verifyName('abc')).toBeTruthy();
    expect(verifyName(' fwef')).toBeFalsy();
    expect(verifyName('f3_ewf3')).toBeTruthy();
    expect(verifyName('32f')).toBeFalsy();
    expect(verifyName('few fewf')).toBeFalsy();
    expect(verifyName('fwef.f')).toBeFalsy();
    expect(verifyName('fwef_fwe-f')).toBeFalsy();
  });
});

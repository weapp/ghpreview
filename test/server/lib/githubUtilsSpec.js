import 'assert'
import {expect} from 'chai'
import {extractBranchAndPath} from  '../../../server/lib/gitHubUtils'

describe('extractBranchAndPath()', function() {

    it('should return ["master", "/"]', function() {
      expect(extractBranchAndPath('', [])).to.eql(['master', '/'])
    });

    it('should return ["branch", "/path/"]', function() {
      expect(extractBranchAndPath('branch/path/', ['branch'])).to.eql(['branch', '/path/'])
    });


    it('should return ["branch", "/path"]', function() {
      expect(extractBranchAndPath('branch/path', ['branch'])).to.eql(['branch', '/path'])
    });

    it('should return ["master", ""]', function() {
      expect(extractBranchAndPath('branch', ['branch'])).to.eql(['branch', ''])
    });

    it('should return ["master", "/"]', function() {
      expect(extractBranchAndPath('branch/', ['branch'])).to.eql(['branch', '/'])
    });

});

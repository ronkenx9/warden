// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract AgentIdentityRegistry is ERC721URIStorage {
    error NotAgentOwnerOrOperator();
    error ReservedMetadataKey();
    error UnauthorizedSlashRecorder();
    error UnknownAgentWallet();

    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(
        uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue
    );

    bytes32 private constant AGENT_WALLET_KEY_HASH = keccak256(bytes("agentWallet"));

    uint256 private nextAgentId = 1;

    mapping(uint256 agentId => mapping(bytes32 metadataKeyHash => bytes metadataValue)) private metadata;
    mapping(uint256 agentId => address wallet) private agentWallets;
    mapping(address wallet => uint256 agentId) private agentIdsByWallet;
    mapping(uint256 agentId => bytes32[] proofs) private violationProofs;

    address public slashRecorder;

    constructor() ERC721("WARDEN Agent Identity", "WAI") {}

    function register() external returns (uint256 agentId) {
        MetadataEntry[] memory empty;
        return _register("", empty);
    }

    function register(string calldata agentURI) external returns (uint256 agentId) {
        MetadataEntry[] memory empty;
        return _register(agentURI, empty);
    }

    function register(string calldata agentURI, MetadataEntry[] calldata entries) external returns (uint256 agentId) {
        return _register(agentURI, entries);
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        _requireAgentOwnerOrOperator(agentId);
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    function setSlashRecorder(address recorder) external {
        if (slashRecorder != address(0) && msg.sender != slashRecorder) {
            revert UnauthorizedSlashRecorder();
        }
        slashRecorder = recorder;
    }

    function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory) {
        _requireOwned(agentId);
        return metadata[agentId][_metadataKeyHash(metadataKey)];
    }

    function setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue) external {
        _requireAgentOwnerOrOperator(agentId);
        _setMetadata(agentId, metadataKey, metadataValue);
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        _requireOwned(agentId);
        return agentWallets[agentId];
    }

    function agentIdOfWallet(address wallet) external view returns (uint256) {
        return agentIdsByWallet[wallet];
    }

    function violationCount(uint256 agentId) external view returns (uint256) {
        _requireOwned(agentId);
        return violationProofs[agentId].length;
    }

    function violationProof(uint256 agentId, uint256 index) external view returns (bytes32) {
        _requireOwned(agentId);
        return violationProofs[agentId][index];
    }

    function recordViolation(address agentWallet, bytes32 proofHash) external {
        if (msg.sender != slashRecorder) {
            revert UnauthorizedSlashRecorder();
        }

        uint256 agentId = agentIdsByWallet[agentWallet];
        if (agentId == 0) {
            revert UnknownAgentWallet();
        }

        violationProofs[agentId].push(proofHash);
    }

    function unsetAgentWallet(uint256 agentId) external {
        _requireAgentOwnerOrOperator(agentId);
        _setAgentWallet(agentId, address(0));
    }

    function _register(string memory agentURI, MetadataEntry[] memory entries) private returns (uint256 agentId) {
        agentId = nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        _setAgentWallet(agentId, msg.sender);

        for (uint256 i = 0; i < entries.length; i++) {
            _setMetadata(agentId, entries[i].metadataKey, entries[i].metadataValue);
        }

        emit Registered(agentId, agentURI, msg.sender);
    }

    function _setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) private {
        if (_metadataKeyHash(metadataKey) == AGENT_WALLET_KEY_HASH) {
            revert ReservedMetadataKey();
        }

        bytes32 keyHash = _metadataKeyHash(metadataKey);
        metadata[agentId][keyHash] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    function _setAgentWallet(uint256 agentId, address wallet) private {
        address previousWallet = agentWallets[agentId];
        if (previousWallet != address(0)) {
            delete agentIdsByWallet[previousWallet];
        }

        agentWallets[agentId] = wallet;
        if (wallet != address(0)) {
            agentIdsByWallet[wallet] = agentId;
        }
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(wallet));
    }

    function _requireAgentOwnerOrOperator(uint256 agentId) private view {
        address owner = ownerOf(agentId);
        if (msg.sender != owner && getApproved(agentId) != msg.sender && !isApprovedForAll(owner, msg.sender)) {
            revert NotAgentOwnerOrOperator();
        }
    }

    function _metadataKeyHash(string memory metadataKey) private pure returns (bytes32) {
        return keccak256(bytes(metadataKey));
    }

    function _update(address to, uint256 agentId, address auth) internal override returns (address from) {
        from = super._update(to, agentId, auth);
        if (from != address(0) && to != address(0)) {
            _setAgentWallet(agentId, address(0));
        }
    }
}

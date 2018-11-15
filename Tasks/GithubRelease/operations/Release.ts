import tl = require("vsts-task-lib/task");
import util = require("util");
import path = require("path");
import fs = require('fs');
import mime = require('mime');
import { Utility } from "./Utility";
import { WebRequest, sendRequest, WebResponse } from "./webClient";

export class Release {

    public static async createRelease(githubEndpoint: string, repositoryName: string, target: string, tag: string, releaseTitle: string, releaseNote: string, isDraft: boolean, isPrerelease: boolean): Promise<WebResponse> {

        let request = new WebRequest();
        
        request.uri = util.format(this._createReleaseApiUrlFormat, Utility.getGitHubApiUrl(), repositoryName);
        request.method = "POST";
        request.body = JSON.stringify({
            "tag_name": tag,
            "target_commitish": target,
            "name": releaseTitle,
            "body": releaseNote,
            "draft": isDraft,
            "prerelease": isPrerelease
        });
        request.headers = {
            "Content-Type": "application/json",
            'Authorization': 'token ' + Utility.getGithubEndPointToken(githubEndpoint)
        };
        tl.debug("Create release request:\n" + JSON.stringify(request, null, 2));

        return await sendRequest(request);
    }

    public static async editRelease(githubEndpoint: string, repositoryName: string, tag: string, releaseTitle: string, releaseNote: string, isDraft: boolean, isPrerelease: boolean): Promise<WebResponse> {
        let releaseResponse = await this._getReleaseByTag(githubEndpoint, repositoryName, tag);

        if (releaseResponse.statusCode === 200) {
            let request = new WebRequest();
            
            request.uri = util.format(this._editOrDiscardReleaseApiUrlFormat, Utility.getGitHubApiUrl(), repositoryName, releaseResponse.body[this._idKey]);
            request.method = "PATCH";
            request.body = JSON.stringify({
                "tag_name": tag,
                "name": releaseTitle,
                "body": releaseNote,
                "draft": isDraft,
                "prerelease": isPrerelease
            });
            request.headers = {
                "Content-Type": "application/json",
                'Authorization': 'token ' + Utility.getGithubEndPointToken(githubEndpoint)
            };
            tl.debug("Edit release request:\n" + JSON.stringify(request, null, 2));

            return await sendRequest(request);
        }
        else {
            tl.debug("Get release by tag response:\n" + JSON.stringify(releaseResponse));
            throw new Error(tl.loc("GetReleaseByTagError"));
        }

    }

    public static async discardRelease(githubEndpoint: string, repositoryName: string, tag: string): Promise<WebResponse> {
        let releaseResponse = await this._getReleaseByTag(githubEndpoint, repositoryName, tag);

        if (releaseResponse.statusCode === 200) {
            let request = new WebRequest();
            
            request.uri = util.format(this._editOrDiscardReleaseApiUrlFormat, Utility.getGitHubApiUrl(), repositoryName, releaseResponse.body[this._idKey]);
            request.method = "DELETE";
            request.headers = {
                'Authorization': 'token ' + Utility.getGithubEndPointToken(githubEndpoint)
            };
            tl.debug("Discard release request:\n" + JSON.stringify(request, null, 2));

            return await sendRequest(request);
        }
        else {
            tl.debug("Get release by tag response:\n" + JSON.stringify(releaseResponse));
            throw new Error(tl.loc("GetReleaseByTagError"));
        }

    }

    public static async deleteReleaseAsset(githubEndpoint: string, repositoryName: string, asset_id: string): Promise<WebResponse> {
        let request = new WebRequest();
        
        request.uri = util.format(this._deleteReleaseAssetApiUrlFormat, Utility.getGitHubApiUrl(), repositoryName, asset_id);
        request.method = "DELETE";
        request.headers = {
            'Authorization': 'token ' + Utility.getGithubEndPointToken(githubEndpoint)
        };
        tl.debug("Delete release asset request:\n" + JSON.stringify(request, null, 2));

        return await sendRequest(request);
    }


    public static async uploadReleaseAsset(githubEndpoint: string, filePath: string, uploadUrl: string): Promise<WebResponse> {
        let fileName = path.basename(filePath);
        tl.debug("Filename: " + fileName);
        
        let rd = fs.createReadStream(filePath);
        var stats = fs.statSync(filePath);

        let request = new WebRequest();
        request.uri = util.format(this._uploadReleaseAssetApiUrlFormat, uploadUrl.split('{')[0], fileName);
        request.method = "POST";
        request.headers = {
            "Content-Type": mime.lookup(fileName),
            'Content-Length': stats.size,
            'Authorization': 'token ' + Utility.getGithubEndPointToken(githubEndpoint)
        };
        request.body = rd;
        tl.debug("Upload release request:\n" + JSON.stringify(request, null, 2));

        return await sendRequest(request);
    }

    public static async getBranch(githubEndpoint: string, repositoryName: string, target: string): Promise<WebResponse> {
        let request = new WebRequest();
        
        request.uri = util.format(this._getBranchApiUrlFormat, Utility.getGitHubApiUrl(), repositoryName, target);
        request.method = "GET";
        request.headers = {
            'Authorization': 'token ' + Utility.getGithubEndPointToken(githubEndpoint)
        };
        tl.debug("Get branch request:\n" + JSON.stringify(request, null, 2));

        return await sendRequest(request);
    }

    public static async getTags(githubEndpoint: string, repositoryName: string): Promise<WebResponse> {
        let request = new WebRequest();
        
        request.uri = util.format(this._getTagsApiUrlFormat, Utility.getGitHubApiUrl(), repositoryName);
        request.method = "GET";
        request.headers = {
            'Authorization': 'token ' + Utility.getGithubEndPointToken(githubEndpoint)
        };
        tl.debug("Get tags request:\n" + JSON.stringify(request, null, 2));

        return await sendRequest(request);
    }

    private static async _getReleaseByTag(githubEndpoint: string, repositoryName: string, tag: string): Promise<WebResponse> {
        let request = new WebRequest();
        
        request.uri = util.format(this._getReleaseByTagApiUrlFormat, Utility.getGitHubApiUrl(), repositoryName, tag);
        request.method = "GET";
        request.headers = {
            'Authorization': 'token ' + Utility.getGithubEndPointToken(githubEndpoint)
        };
        tl.debug("Get release by tag request:\n" + JSON.stringify(request, null, 2));

        return await sendRequest(request);
    }

    private static readonly _idKey: string = "id";
    private static readonly _createReleaseApiUrlFormat: string = "%s/repos/%s/releases";
    private static readonly _editOrDiscardReleaseApiUrlFormat: string = "%s/repos/%s/releases/%s";
    private static readonly _deleteReleaseAssetApiUrlFormat: string = "%s/repos/%s/releases/assets/%s";
    private static readonly _uploadReleaseAssetApiUrlFormat: string = "%s?name=%s";
    private static readonly _getReleaseByTagApiUrlFormat: string = "%s/repos/%s/releases/tags/%s";
    private static readonly _getBranchApiUrlFormat: string = "%s/repos/%s/branches/%s";
    private static readonly _getTagsApiUrlFormat: string = "%s/repos/%s/tags";
}